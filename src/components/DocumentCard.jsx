import { useState } from 'react'
import {
  FiCalendar, FiFolder, FiTrash2, FiMessageSquare, FiEdit2, FiPaperclip, FiRefreshCw, FiMail,
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { STATUS, RENEWAL_STAGES, relativeText, formatDate } from '../utils/status'
import { whatsappLink, openExternal } from '../utils/format'
import { openAttachment } from '../utils/files'
import { useAppData } from '../context/AppData'

function clientMessage(doc, days, company, settings) {
  const hello = company?.contact_name ? `Olá, ${company.contact_name.split(' ')[0]}! Tudo bem?` : 'Olá! Tudo bem?'
  const when = days < 0
    ? `venceu em ${formatDate(doc.expiry_date)}`
    : days === 0 ? 'vence hoje' : `vence em ${formatDate(doc.expiry_date)} (daqui a ${days} dia${days > 1 ? 's' : ''})`
  const sign = settings.office_name ? `\n\n${settings.office_name}` : ''
  return `${hello}\n\nPassando para lembrar que o documento *${doc.category}* da empresa *${doc.title}* ${when}.\n\nPodemos dar andamento à renovação?${sign}`
}

export default function DocumentCard({ doc, days, statusKey, company, onEdit, onRenew, onDelete }) {
  const { settings, push } = useAppData()
  const [opening, setOpening] = useState(false)
  const status = STATUS[statusKey]
  const stage = RENEWAL_STAGES[doc.renewal_status]

  async function viewFile() {
    setOpening(true)
    try { await openAttachment(doc.file_path, doc.file_name || 'documento.pdf') }
    catch (e) { console.error(e); push('Não foi possível abrir o anexo.', 'error') }
    finally { setOpening(false) }
  }

  function notifyWhatsapp() {
    openExternal(whatsappLink(company.phone, clientMessage(doc, days, company, settings)))
  }

  function notifyEmail() {
    const subject = `Vencimento de ${doc.category} — ${doc.title}`
    const body = clientMessage(doc, days, company, settings).replace(/\*/g, '')
    openExternal(`mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  return (
    <article className={`doc-card is-${statusKey}`}>
      <header className="doc-card__top">
        <span className="chip">
          <FiFolder aria-hidden="true" />
          {doc.category}
        </span>
        <span className={`status-pill is-${statusKey}`}>
          <span className="status-pill__dot" />
          {statusKey === 'renovacao' ? stage : status.label}
        </span>
      </header>

      <h3 className="doc-card__title" title={doc.title}>{doc.title}</h3>

      <div className="doc-card__due">
        <FiCalendar aria-hidden="true" />
        <div>
          <strong>{formatDate(doc.expiry_date)}</strong>
          <span className={`doc-card__relative is-${statusKey}`}>{relativeText(days)}</span>
        </div>
      </div>

      {stage && statusKey !== 'renovacao' && (
        <p className="doc-card__stage"><FiRefreshCw aria-hidden="true" /> {stage}</p>
      )}

      {doc.observation && (
        <p className="doc-card__obs">
          <FiMessageSquare aria-hidden="true" />
          <span>{doc.observation}</span>
        </p>
      )}

      <footer className="doc-card__footer">
        <div className="doc-card__tools">
          {doc.file_path && (
            <button type="button" className="icon-btn icon-btn--primary" onClick={viewFile} disabled={opening}
              title="Ver anexo" aria-label={`Ver anexo de ${doc.title}`}>
              <FiPaperclip />
            </button>
          )}
          {company?.phone && (
            <button type="button" className="icon-btn icon-btn--zap" onClick={notifyWhatsapp}
              title={`Avisar ${doc.title} no WhatsApp`} aria-label={`Avisar ${doc.title} no WhatsApp`}>
              <FaWhatsapp />
            </button>
          )}
          {company?.email && (
            <button type="button" className="icon-btn icon-btn--primary" onClick={notifyEmail}
              title={`Avisar ${doc.title} por e-mail`} aria-label={`Avisar ${doc.title} por e-mail`}>
              <FiMail />
            </button>
          )}
        </div>
        <div className="doc-card__tools">
          <button type="button" className="icon-btn icon-btn--primary" onClick={() => onRenew(doc)}
            title="Renovação: etapas e novo vencimento" aria-label={`Renovação de ${doc.title}`}>
            <FiRefreshCw />
          </button>
          <button type="button" className="icon-btn icon-btn--primary" onClick={() => onEdit(doc)}
            title="Editar documento" aria-label={`Editar ${doc.title}`}>
            <FiEdit2 />
          </button>
          <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(doc)}
            title="Excluir documento" aria-label={`Excluir ${doc.title}`}>
            <FiTrash2 />
          </button>
        </div>
      </footer>
    </article>
  )
}
