export default function StatCard({ icon: Icon, label, value, total, tone, active, onClick }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <button
      type="button"
      className={`stat-card tone-${tone}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="stat-card__icon"><Icon aria-hidden="true" /></span>
      <span className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
      </span>
      {tone !== 'neutral' && (
        <span className="stat-card__bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
      )}
      {tone !== 'neutral' && <span className="stat-card__pct">{pct}% do total</span>}
      {tone === 'neutral' && <span className="stat-card__pct">Documentos cadastrados</span>}
    </button>
  )
}
