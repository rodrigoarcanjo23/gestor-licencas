import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { formatCNPJ, formatPhone, isValidCNPJ, onlyDigits } from '../utils/format'
import { lookupCNPJ } from '../utils/cnpj'
import { useAppData } from '../context/AppData'

export default function CompanyForm({ initial = null, onDone, onCancel }) {
  const { saveCompany } = useAppData()
  const [v, setV] = useState({
    name: initial?.name || '',
    cnpj: initial?.cnpj ? formatCNPJ(initial.cnpj) : '',
    contact_name: initial?.contact_name || '',
    phone: initial?.phone ? formatPhone(initial.phone) : '',
    email: initial?.email || '',
    notes: initial?.notes || '',
  })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [looking, setLooking] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))

  async function handleLookup() {
    if (!isValidCNPJ(v.cnpj)) { setError('CNPJ inválido. Confira os números.'); return }
    setError(''); setInfo(''); setLooking(true)
    try {
      const r = await lookupCNPJ(v.cnpj)
      setV((s) => ({
        ...s,
        name: s.name || r.name,
        phone: s.phone || r.phone,
        email: s.email || r.email,
      }))
      setInfo([r.legalName, r.city, r.situation && `Situação: ${r.situation}`].filter(Boolean).join(' · '))
    } catch (e) {
      setError(e.message)
    } finally {
      setLooking(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!v.name.trim()) { setError('Informe o nome da empresa.'); return }
    if (v.cnpj && !isValidCNPJ(v.cnpj)) { setError('CNPJ inválido. Confira ou deixe em branco.'); return }
    setError('')
    setSaving(true)
    const ok = await saveCompany({
      name: v.name.trim(),
      cnpj: v.cnpj ? onlyDigits(v.cnpj) : null,
      contact_name: v.contact_name.trim() || null,
      phone: v.phone ? onlyDigits(v.phone) : null,
      email: v.email.trim().toLowerCase() || null,
      notes: v.notes.trim() || null,
    }, initial)
    setSaving(false)
    if (ok) onDone?.()
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="c-cnpj">CNPJ <span className="muted">(preenche os dados automaticamente)</span></label>
        <div className="input-group">
          <input id="c-cnpj" className="input" inputMode="numeric" placeholder="00.000.000/0000-00"
            value={v.cnpj} onChange={(e) => setV((s) => ({ ...s, cnpj: formatCNPJ(e.target.value) }))} />
          <button type="button" className="btn btn--ghost" onClick={handleLookup}
            disabled={looking || onlyDigits(v.cnpj).length !== 14}>
            <FiSearch /> {looking ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {info && <p className="field__info">{info}</p>}
      </div>

      <div className="field">
        <label htmlFor="c-name">Nome da empresa</label>
        <input id="c-name" className="input" placeholder="Ex: Padaria Estrela" value={v.name} onChange={set('name')} />
      </div>

      <div className="form__row">
        <div className="field">
          <label htmlFor="c-contact">Responsável</label>
          <input id="c-contact" className="input" placeholder="Ex: Maria Souza" value={v.contact_name} onChange={set('contact_name')} />
        </div>
        <div className="field">
          <label htmlFor="c-phone">WhatsApp</label>
          <input id="c-phone" className="input" inputMode="tel" placeholder="(85) 99999-9999"
            value={v.phone} onChange={(e) => setV((s) => ({ ...s, phone: formatPhone(e.target.value) }))} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="c-email">E-mail</label>
        <input id="c-email" type="email" className="input" placeholder="contato@empresa.com.br" value={v.email} onChange={set('email')} />
      </div>

      <div className="field">
        <label htmlFor="c-notes">Anotações <span className="muted">(opcional)</span></label>
        <textarea id="c-notes" className="input" rows={2} value={v.notes} onChange={set('notes')} />
      </div>

      {error && <p className="form__error" role="alert">{error}</p>}

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Cadastrar empresa'}
        </button>
      </div>
    </form>
  )
}
