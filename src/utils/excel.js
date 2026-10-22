import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { CATEGORIES, STATUS, RENEWAL_STAGES, formatDate } from './status'
import { normalizeText } from './format'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

async function saveWorkbook(workbook, fileName) {
  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
    const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
    await FileOpener.openFile({ path: result.uri, mimeType: XLSX_MIME })
  } else {
    XLSX.writeFile(workbook, fileName)
  }
}

// --- EXPORTAR ---------------------------------------------------------
// As 4 primeiras colunas são as mesmas da importação (dá para editar e reimportar)
export async function exportDocuments(items, companiesById) {
  const rows = items.map(({ doc, days, statusKey }) => {
    const company = companiesById[doc.company_id]
    return {
      'Empresa': doc.title,
      'Categoria': doc.category,
      'Vencimento': formatDate(doc.expiry_date),
      'Observação': doc.observation || '',
      'CNPJ': company?.cnpj || '',
      'Dias Restantes': days,
      'Status': STATUS[statusKey].exportLabel,
      'Renovação': RENEWAL_STAGES[doc.renewal_status] || '',
      'Anexo': doc.file_path ? 'Sim' : 'Não',
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 8 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
  await saveWorkbook(wb, `DOC_em_dia_${Date.now()}.xlsx`)
}

export async function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Empresa', 'Categoria', 'Vencimento', 'Observação', 'CNPJ'],
    ['Padaria Estrela', 'Alvará de funcionamento', '31/12/2026', 'Falar com o financeiro', '00.000.000/0001-00'],
    ['Clínica Vida', 'Licença Sanitária', '15/03/2027', '', ''],
  ])
  ws['!cols'] = [{ wch: 30 }, { wch: 26 }, { wch: 12 }, { wch: 30 }, { wch: 20 }]
  const cats = XLSX.utils.aoa_to_sheet([['Categorias aceitas'], ...CATEGORIES.map((c) => [c])])
  cats['!cols'] = [{ wch: 30 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Documentos')
  XLSX.utils.book_append_sheet(wb, cats, 'Categorias')
  await saveWorkbook(wb, 'Modelo_importacao_DOC_em_dia.xlsx')
}

// --- IMPORTAR ---------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0')

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    // alguns programas gravam 23:59:59 do dia anterior; arredonda para o dia certo
    const serial = value % 1 > 0.99 ? Math.ceil(value) : Math.floor(value)
    const d = XLSX.SSF.parse_date_code(serial)
    if (!d || !d.y) return null
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`
  }
  const s = String(value).trim()
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/) // dd/mm/aaaa
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return valid(`${y}-${pad(m[2])}-${pad(m[1])}`)
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/) // aaaa-mm-dd
  if (m) return valid(`${m[1]}-${pad(m[2])}-${pad(m[3])}`)
  return null
}

function valid(iso) {
  const [y, mo, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? iso : null
}

const HEADERS = {
  empresa: 'title', 'nome da empresa': 'title', cliente: 'title',
  categoria: 'category', tipo: 'category', documento: 'category',
  vencimento: 'expiry_date', validade: 'expiry_date', 'data de vencimento': 'expiry_date',
  observacao: 'observation', obs: 'observation', observacoes: 'observation',
  cnpj: 'cnpj',
}

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [normalizeText(c), c]))

// Lê o arquivo e devolve as linhas já validadas para a prévia
export async function parseImportFile(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })

  return raw
    .map((r, i) => {
      const row = { line: i + 2, title: '', category: '', expiry_date: null, observation: '', cnpj: '', errors: [] }
      let rawDate = ''
      for (const [key, value] of Object.entries(r)) {
        const field = HEADERS[normalizeText(key)]
        if (!field) continue
        if (field === 'expiry_date') rawDate = value
        else row[field] = String(value ?? '').trim()
      }
      if (!row.title && !row.category && rawDate === '') return null // linha vazia

      row.expiry_date = parseDate(rawDate)
      const known = CATEGORY_MAP[normalizeText(row.category)]
      if (known) row.category = known
      else if (row.category) row.warning = 'Categoria fora da lista (será mantida como está)'

      if (!row.title) row.errors.push('Sem empresa')
      if (!row.category) row.errors.push('Sem categoria')
      if (!row.expiry_date) row.errors.push(rawDate === '' ? 'Sem vencimento' : 'Data inválida')
      return row
    })
    .filter(Boolean)
}
