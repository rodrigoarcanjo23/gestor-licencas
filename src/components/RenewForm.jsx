import { useState } from 'react'
import { addMonths, parseISO, format, parseJSON } from 'date-fns'
import { FiCheckCircle } from 'react-icons/fi'
import { RENEWAL_STAGES, formatDate, validityFor, toISODate } from '../utils/status'
import { validateFile } from '../utils/files'
import { useAppData } from '../context/AppData'
import FilePicker from './FilePicker'

const STAGES = Object.entries(RENEWAL_STAGES)

function historyLine(h) {
  if (h.type === 'renovado') return `Renovado: ${formatDate(h.from)} → ${formatDate(h.to)}${h.note ? ` · ${h.note}` : ''}`
  return h.stage ? `Etapa: ${RENEWAL_STAGES[h.stage] || h.stage}` : 'Renovação cancelada'
}

export default function RenewForm({ doc, onDone }) {
  const { settings, setRenewalStage, completeRenewal } = useAppData()
  const months = validityFor(doc.category, settings)
  const [newDate, setNewDate] = useState(months ? toISODate(addMonths(parseISO(doc.expiry_date), months)) : '')
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [busy, setBusy] = useState(false)
  const history = [...(doc.renewal_history || [])].reverse()

  async function changeStage(stage) {
    setBusy(true)
    const ok = await setRenewalStage(doc, stage)
    setBusy(false)
    if (ok) onDone()
  }

  async function finish(e) {
    e.preventDefault()
    if (!newDate) return
    setBusy(true)
    const ok = await completeRenewal(doc, { newDate, note: note.trim(), file })
    setBusy(false)
    if (ok) onDone()
  }

  return (
    <div className="renew">
      <section className="renew__block">
        <h3>Em que etapa está?</h3>
        <p className="muted">Documentos em renovação deixam de aparecer como vencidos ou em alerta.</p>
        <div className="renew__stages">
          {STAGES.map(([key, label], i) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              className={`stage-btn${doc.renewal_status === key ? ' is-active' : ''}`}
              onClick={() => changeStage(key)}
            >
              <span className="stage-btn__num">{i + 1}</span>{label}
            </button>
          ))}
        </div>
        {doc.renewal_status && (
          <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => changeStage(null)}>
            Cancelar renovação
          </button>
        )}
      </section>

      <form className="renew__block form" onSubmit={finish}>
        <h3>Concluir renovação</h3>
        <p className="muted">Vencimento atual: <strong>{formatDate(doc.expiry_date)}</strong>
          {months ? ` · sugestão com validade de ${months} meses` : ''}</p>
        <div className="form__row">
          <div className="field">
            <label htmlFor="r-date">Novo vencimento</label>
            <input id="r-date" type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="r-note">Observação <span className="muted">(opcional)</span></label>
            <input id="r-note" className="input" placeholder="Ex: protocolo 12345" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <FilePicker
          file={file}
          onPick={(f) => { const err = validateFile(f); setFileError(err || ''); if (!err) setFile(f) }}
          onRemove={() => setFile(null)}
          error={fileError}
        />
        <div className="form__actions">
          <button type="submit" className="btn btn--success" disabled={busy || !newDate}>
            <FiCheckCircle /> Salvar renovação
          </button>
        </div>
      </form>

      {history.length > 0 && (
        <section className="renew__block">
          <h3>Histórico</h3>
          <ol className="timeline">
            {history.map((h, i) => (
              <li key={i}>
                <time>{format(parseJSON(h.at), 'dd/MM/yyyy HH:mm')}</time>
                <span>{historyLine(h)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
