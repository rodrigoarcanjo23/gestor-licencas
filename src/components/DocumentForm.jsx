import { useState } from 'react'
import { CATEGORIES } from '../utils/status'

// `initial` = documento a editar (ou null para um novo cadastro)
export default function DocumentForm({ initial = null, onSubmit, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [category, setCategory] = useState(initial?.category || '')
  const [date, setDate] = useState(initial?.expiry_date?.slice(0, 10) || '')
  const [obs, setObs] = useState(initial?.observation || '')
  const [error, setError] = useState('')
  const isEdit = !!initial

  // Mantém categorias antigas que não estejam mais na lista
  const categories = category && !CATEGORIES.includes(category) ? [category, ...CATEGORIES] : CATEGORIES

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !category || !date) {
      setError('Preencha empresa, categoria e vencimento.')
      return
    }
    setError('')
    const ok = await onSubmit({ title: title.trim(), category, expiry_date: date, observation: obs.trim() })
    if (ok && !isEdit) { setTitle(''); setCategory(''); setDate(''); setObs('') }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="f-title">Nome da empresa</label>
        <input id="f-title" className="input" placeholder="Ex: Padaria Estrela" value={title}
          onChange={(e) => setTitle(e.target.value)} autoFocus />
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

      <div className="field">
        <label htmlFor="f-obs">Observação <span className="muted">(opcional)</span></label>
        <textarea id="f-obs" className="input" rows={3} placeholder="Ex: Falar com o financeiro..."
          value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>

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
