import { FiCalendar, FiFolder, FiTrash2, FiMessageSquare, FiEdit2 } from 'react-icons/fi'
import { STATUS, relativeText, formatDate } from '../utils/status'

export default function DocumentCard({ doc, days, statusKey, onEdit, onDelete }) {
  const status = STATUS[statusKey]

  return (
    <article className={`doc-card is-${statusKey}`}>
      <header className="doc-card__top">
        <span className="chip">
          <FiFolder aria-hidden="true" />
          {doc.category}
        </span>
        <span className={`status-pill is-${statusKey}`}>
          <span className="status-pill__dot" />
          {status.label}
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

      {doc.observation && (
        <p className="doc-card__obs">
          <FiMessageSquare aria-hidden="true" />
          <span>{doc.observation}</span>
        </p>
      )}

      <footer className="doc-card__footer">
        <button
          type="button"
          className="icon-btn icon-btn--primary"
          onClick={() => onEdit(doc)}
          aria-label={`Editar ${doc.title}`}
          title="Editar documento"
        >
          <FiEdit2 />
          <span>Editar</span>
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={() => onDelete(doc)}
          aria-label={`Excluir ${doc.title}`}
          title="Excluir documento"
        >
          <FiTrash2 />
          <span>Excluir</span>
        </button>
      </footer>
    </article>
  )
}
