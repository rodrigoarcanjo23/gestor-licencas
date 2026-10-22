import { differenceInDays, parseISO, startOfDay, format } from 'date-fns'

// Quantos dias antes do vencimento o documento entra em "alerta"
export const ALERT_DAYS = 30

export const CATEGORIES = [
  'Alvará de funcionamento', 'Licença Sanitária', 'CRF/CE', 'AVCB',
  'Laudos Ocupacionais', 'Licença Ambiental',
  'PGRS/PGRSS',
  'PCMSO', 'PGR', 'LTCAT', 'ASO', 'Estudos Térmicos',
  'Certificado ISO9001', 'Certificado SASSMAQ', 'CBPF', 'CBPD',
  'IBAMA', 'Polícia Federal', 'Outros'
]

export const STATUS = {
  vencido: { key: 'vencido', label: 'Vencido', exportLabel: 'VENCIDO' },
  alerta: { key: 'alerta', label: 'Em alerta', exportLabel: 'ALERTA' },
  ok: { key: 'ok', label: 'Em dia', exportLabel: 'Em dia' },
}

// Dias até o vencimento, contados a partir do início do dia de hoje
// (evita que um documento que vence amanhã apareça como "vence hoje").
export function getDays(doc) {
  return differenceInDays(parseISO(doc.expiry_date), startOfDay(new Date()))
}

export function getStatusKey(days) {
  if (days < 0) return 'vencido'
  if (days <= ALERT_DAYS) return 'alerta'
  return 'ok'
}

export function relativeText(days) {
  if (days < 0) {
    const n = Math.abs(days)
    return `Vencido há ${n} dia${n > 1 ? 's' : ''}`
  }
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${days} dias`
}

export function formatDate(iso) {
  return format(parseISO(iso), 'dd/MM/yyyy')
}
