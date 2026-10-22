import { useState } from 'react'
import { FiSave, FiMail, FiBell, FiCalendar, FiBriefcase } from 'react-icons/fi'
import { useAppData } from '../../context/AppData'
import { CATEGORIES, DEFAULT_VALIDITY } from '../../utils/status'
import { formatPhone, onlyDigits } from '../../utils/format'
import './settings.css'

const STEP_OPTIONS = [90, 60, 30, 15, 7, 3, 1, 0]
const stepLabel = (n) => (n === 0 ? 'No dia' : n === 1 ? '1 dia antes' : `${n} dias antes`)

export default function Settings() {
  const { settings, user, saveSettings, loading } = useAppData()
  if (loading) return <div className="page-head"><h1>Configurações</h1></div>
  return <SettingsForm key={settings.updated_at || 'novo'} settings={settings} user={user} saveSettings={saveSettings} />
}

function SettingsForm({ settings, user, saveSettings }) {
  const [v, setV] = useState({
    office_name: settings.office_name || '',
    report_name: settings.report_name || '',
    report_email: settings.report_email || user?.email || '',
    report_whatsapp: settings.report_whatsapp ? formatPhone(settings.report_whatsapp) : '',
    alert_days: settings.alert_days ?? 30,
    email_enabled: settings.email_enabled ?? true,
    notify_mode: settings.notify_mode || 'etapas',
    notify_steps: settings.notify_steps || [60, 30, 15, 7, 0],
    category_validity: settings.category_validity || {},
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))

  function toggleStep(n) {
    setV((s) => ({
      ...s,
      notify_steps: s.notify_steps.includes(n) ? s.notify_steps.filter((x) => x !== n) : [...s.notify_steps, n].sort((a, b) => b - a),
    }))
  }

  function setValidity(cat, value) {
    setV((s) => {
      const next = { ...s.category_validity }
      if (value === '') delete next[cat]
      else next[cat] = Math.max(0, Math.min(120, Number(value)))
      return { ...s, category_validity: next }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await saveSettings({
      office_name: v.office_name.trim() || null,
      report_name: v.report_name.trim() || null,
      report_email: v.report_email.trim().toLowerCase() || null,
      report_whatsapp: onlyDigits(v.report_whatsapp) || null,
      alert_days: Math.max(1, Math.min(365, Number(v.alert_days) || 30)),
      email_enabled: v.email_enabled,
      notify_mode: v.notify_mode,
      notify_steps: v.notify_steps,
      category_validity: v.category_validity,
    })
    setSaving(false)
  }

  return (
    <form className="settings" onSubmit={handleSubmit}>
      <div className="page-head">
        <div>
          <h1>Configurações</h1>
          <p className="page-head__date">Ajustes da sua conta · {user?.email}</p>
        </div>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <FiSave /> {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      <section className="settings-card">
        <header><FiBriefcase /><div><h2>Seu escritório</h2><p>Aparece nos relatórios e nas mensagens enviadas às empresas.</p></div></header>
        <div className="field">
          <label htmlFor="s-office">Nome do escritório ou empresa</label>
          <input id="s-office" className="input" placeholder="Ex: Damasceno Consultoria" value={v.office_name} onChange={set('office_name')} />
        </div>
      </section>

      <section className="settings-card">
        <header><FiMail /><div><h2>Quem recebe os relatórios</h2><p>Usado nos botões de e-mail e WhatsApp e nos alertas automáticos.</p></div></header>
        <div className="form__row">
          <div className="field">
            <label htmlFor="s-name">Nome do destinatário</label>
            <input id="s-name" className="input" placeholder="Ex: Renata" value={v.report_name} onChange={set('report_name')} />
          </div>
          <div className="field">
            <label htmlFor="s-email">E-mail</label>
            <input id="s-email" type="email" className="input" placeholder="voce@empresa.com.br" value={v.report_email} onChange={set('report_email')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="s-zap">WhatsApp</label>
          <input id="s-zap" className="input" inputMode="tel" placeholder="(85) 99999-9999" value={v.report_whatsapp}
            onChange={(e) => setV((s) => ({ ...s, report_whatsapp: formatPhone(e.target.value) }))} />
        </div>
      </section>

      <section className="settings-card">
        <header><FiBell /><div><h2>Alertas</h2><p>Quando um documento entra em alerta e quando você recebe e-mail automático.</p></div></header>

        <div className="field field--inline">
          <label htmlFor="s-days">Considerar “em alerta” quando faltarem</label>
          <div className="input-suffix">
            <input id="s-days" type="number" min="1" max="365" className="input" value={v.alert_days} onChange={set('alert_days')} />
            <span>dias</span>
          </div>
        </div>

        <label className="switch">
          <input type="checkbox" checked={v.email_enabled} onChange={(e) => setV((s) => ({ ...s, email_enabled: e.target.checked }))} />
          <span className="switch__track" aria-hidden="true" />
          <span>Receber alertas automáticos por e-mail (todo dia às 8h, quando houver novidade)</span>
        </label>

        {v.email_enabled && (
          <>
            <div className="radio-cards">
              <label className={`radio-card${v.notify_mode === 'etapas' ? ' is-active' : ''}`}>
                <input type="radio" name="mode" value="etapas" checked={v.notify_mode === 'etapas'} onChange={set('notify_mode')} />
                <strong>Por etapas</strong>
                <span>Avisa só quando um documento chega a um dos marcos abaixo. Menos e-mails.</span>
              </label>
              <label className={`radio-card${v.notify_mode === 'diario' ? ' is-active' : ''}`}>
                <input type="radio" name="mode" value="diario" checked={v.notify_mode === 'diario'} onChange={set('notify_mode')} />
                <strong>Resumo diário</strong>
                <span>Todo dia, enquanto houver documento vencido ou em alerta.</span>
              </label>
            </div>
            {v.notify_mode === 'etapas' && (
              <div className="steps">
                {STEP_OPTIONS.map((n) => (
                  <button key={n} type="button" className={`step-chip${v.notify_steps.includes(n) ? ' is-active' : ''}`}
                    onClick={() => toggleStep(n)} aria-pressed={v.notify_steps.includes(n)}>
                    {stepLabel(n)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="settings-card">
        <header><FiCalendar /><div><h2>Validade por categoria</h2><p>Em meses. Usada para sugerir a data no cadastro e na renovação. Deixe em branco quando variar.</p></div></header>
        <div className="validity-grid">
          {CATEGORIES.filter((c) => c !== 'Outros').map((cat) => {
            const custom = v.category_validity[cat]
            return (
              <label key={cat} className="validity-row">
                <span>{cat}</span>
                <input type="number" min="0" max="120" className="input input--sm" inputMode="numeric"
                  placeholder={DEFAULT_VALIDITY[cat] ? String(DEFAULT_VALIDITY[cat]) : '—'}
                  value={custom ?? ''} onChange={(e) => setValidity(cat, e.target.value)} />
              </label>
            )
          })}
        </div>
      </section>

      <div className="settings__footer">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <FiSave /> {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </form>
  )
}
