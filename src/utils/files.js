import { supabase } from '../supabaseClient'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'

export const BUCKET = 'documentos'
export const MAX_FILE_MB = 10
export const ACCEPTED_FILES = 'application/pdf,image/jpeg,image/png,image/webp'

function safeName(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)
}

export function validateFile(file) {
  if (!file) return null
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `O arquivo passa de ${MAX_FILE_MB} MB.`
  if (!ACCEPTED_FILES.split(',').includes(file.type)) return 'Envie um PDF ou uma imagem (JPG, PNG).'
  return null
}

// Caminho: <id do usuário>/<id do documento>/<data>_<nome do arquivo>
export async function uploadAttachment(userId, docId, file) {
  const path = `${userId}/${docId}/${Date.now()}_${safeName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return { file_path: path, file_name: file.name }
}

export async function removeAttachment(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

export async function openAttachment(path, fileName = 'documento.pdf') {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 5)
  if (error) throw error
  if (Capacitor.isNativePlatform()) {
    // Baixa para o cache e abre com o app padrão do celular
    const blob = await (await fetch(data.signedUrl)).blob()
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const result = await Filesystem.writeFile({ path: safeName(fileName), data: base64, directory: Directory.Cache })
    await FileOpener.openFile({ path: result.uri, mimeType: blob.type || 'application/pdf' })
  } else {
    window.open(data.signedUrl, '_blank', 'noopener')
  }
}
