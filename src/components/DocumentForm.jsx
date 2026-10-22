import { useMemo, useState } from 'react'
import { FiZap } from 'react-icons/fi'
import { CATEGORIES, suggestExpiry, formatDate } from '../utils/status'
import { validateFile } from '../utils/files'
import { useAppData } from '../context/AppData'
import FilePicker from './FilePicker'

const NEW = '__nova__'

// `initial` = documento a editar (ou null para um novo cadastro)
export default function DocumentForm({ initial = null, defaultCompanyId = '', onDone, onCancel }) {
  const { companies, settings, saveDocument } = useAppData()
  const isEdit = !!initial

  const [companyId, setCompanyId] = useState(
    initial?.company_id || defaultCompanyId || (companies.length ? '' : NEW)
  )
  const [newCompany, setNewCompany] = useState(!initial?.company_id && initial?.title ? initial.title : '')
  const [category, setCategory] = useState(initial?.category || '')
  const [date, setDate] = useState(initial?.expiry_date?.slice(0, 10) || '')
  const [obs, setObs] = useState(initial?.observation || '')
  const [file, setFile] = useState(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [fileError, setFileError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Documento antigo sem empresa vinculada → começa em "nova empresa" com o nome dele
  const effectiveCompany = !initial?.company_id && initial?.title && !companyId ? NEW : companyId

  const categories = category && !CATEGORIES.includes(category) ? [category, ...CATEGORIES] : CATEGORIES
  const suggestion = useMemo(() => suggestExpiry(category, settings), [category, settings])

  function pickFile(f) {
    const err = validateFile(f)
    setFileError(err || '')
    if (!err) { setFile(f); setRemoveFile(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const isNew = effectiveCompany === NEW
    if ((isNew && !newCompany.trim()) || (!isNew && !effectiveCompany) || !category || !date) {
      setError('Preencha empresa, categoria e vencimento.')
      return
    }
    setError('')
    setSaving(true)
    const ok = await saveDocument(
      {
        company_id: isNew ? null : effectiveCompany,
        newCompanyName: isNew ? newCompany.trim() : null,
        category, expiry_date: date, observation: obs.trim(),
      },
      { file, removeFile, existing: initial }
    )
    setSaving(false)
    if (ok) onDone?.()
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="f-company">Empresa</label>
        {companies.length > 0 && (
          <select id="f-company" className="input" value={effectiveCompany} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">Selecione...</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value={NEW}>+ Nova empresa…</option>
          </select>
        )}
        {effectiveCompany === NEW && (
          <input
            className="input"
            style={companies.length ? { marginTop: 8 } : undefined}
            placeholder="Nome da nova empresa (ex: Padaria Estrela)"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            autoFocus
          />
        )}
      </div>

      <div className="form__row">
        <div className="field">
          <label htmlFor="f-cat">Categoria</label>
          <select id="f-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Selecione...</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-date">Vencimento</label>
          <input id="f-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {suggestion && suggestion.date !== date && (
        <div className="hint">
          <FiZap aria-hidden="true" />
          <span>Validade usual de {category}: {suggestion.months} meses a partir de hoje.</span>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => setDate(suggestion.date)}>
            Usar {formatDate(suggestion.date)}
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor="f-obs">Observação <span className="muted">(opcional)</span></label>
        <textarea id="f-obs" className="input" rows={3} placeholder="Ex: Falar com o financeiro..."
          value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>

      <FilePicker
        file={file}
        currentName={initial?.file_path ? (initial.file_name || 'Anexo atual') : ''}
        removed={removeFile}
        onPick={pickFile}
        onRemove={() => { if (file) setFile(null); else setRemoveFile(true) }}
        error={fileError}
      />

      {error && <p className="form__error" role="alert">{error}</p>}

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar documento'}
        </button>
      </div>
    </form>
  )
}
