import { useRef, useState } from 'react'
import { FiUploadCloud, FiDownload, FiAlertCircle, FiCheck } from 'react-icons/fi'
import { parseImportFile, downloadTemplate } from '../utils/excel'
import { formatDate } from '../utils/status'
import { useAppData } from '../context/AppData'

const PREVIEW_LIMIT = 100

export default function ImportForm({ onDone, onCancel }) {
  const { importRows, docs, push } = useAppData()
  const input = useRef(null)
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)

  const validRows = rows?.filter((r) => r.errors.length === 0) || []
  const invalid = rows ? rows.length - validRows.length : 0

  // Evita duplicar o que já existe (mesma empresa + categoria + vencimento)
  const existingKeys = new Set(docs.map((d) => `${d.title.toLowerCase()}|${d.category}|${d.expiry_date}`))
  const toImport = validRows.filter((r) => !existingKeys.has(`${r.title.toLowerCase()}|${r.category}|${r.expiry_date}`))
  const duplicates = validRows.length - toImport.length

  async function handleFile(file) {
    if (!file) return
    setBusy(true)
    try {
      const parsed = await parseImportFile(file)
      if (parsed.length === 0) push('Não encontrei linhas na planilha. Confira se a primeira linha tem os títulos.', 'info')
      setRows(parsed)
      setFileName(file.name)
    } catch (e) {
      console.error(e)
      push('Não consegui ler esse arquivo. Use .xlsx, .xls ou .csv.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    setBusy(true)
    const ok = await importRows(toImport)
    setBusy(false)
    if (ok) onDone()
  }

  return (
    <div className="import">
      <ol className="import__steps">
        <li>Baixe o modelo ou use a planilha exportada pelo próprio DOC em dia.</li>
        <li>Preencha as colunas <strong>Empresa, Categoria, Vencimento</strong> (dd/mm/aaaa) e, se quiser, Observação e CNPJ.</li>
        <li>Envie o arquivo, confira a prévia e importe.</li>
      </ol>

      <div className="import__actions">
        <button type="button" className="btn btn--ghost" onClick={() => downloadTemplate()}>
          <FiDownload /> Baixar modelo
        </button>
        <button type="button" className="btn btn--primary" onClick={() => input.current?.click()} disabled={busy}>
          <FiUploadCloud /> {fileName ? 'Escolher outro arquivo' : 'Escolher planilha'}
        </button>
        <input ref={input} type="file" hidden accept=".xlsx,.xls,.csv"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      {rows && rows.length > 0 && (
        <>
          <div className="import__summary">
            <span className="tag tag--ok"><FiCheck /> {toImport.length} prontas para importar</span>
            {duplicates > 0 && <span className="tag">{duplicates} já cadastradas (ignoradas)</span>}
            {invalid > 0 && <span className="tag tag--err"><FiAlertCircle /> {invalid} com erro (ignoradas)</span>}
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Linha</th><th>Empresa</th><th>Categoria</th><th>Vencimento</th><th>Situação</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_LIMIT).map((r) => (
                  <tr key={r.line} className={r.errors.length ? 'is-error' : ''}>
                    <td>{r.line}</td>
                    <td>{r.title || '—'}</td>
                    <td>{r.category || '—'}</td>
                    <td>{r.expiry_date ? formatDate(r.expiry_date) : '—'}</td>
                    <td>{r.errors.length ? r.errors.join(', ') : (r.warning || 'OK')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_LIMIT && <p className="muted">Mostrando {PREVIEW_LIMIT} de {rows.length} linhas.</p>}
        </>
      )}

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn--primary" disabled={busy || toImport.length === 0} onClick={handleImport}>
          {busy ? 'Importando...' : `Importar ${toImport.length || ''} documento(s)`}
        </button>
      </div>
    </div>
  )
}
