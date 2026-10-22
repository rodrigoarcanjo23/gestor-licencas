import { differenceInDays, parseISO, startOfDay, format, addMonths } from 'date-fns'

// Padrão de dias para "alerta" (cada usuário pode mudar em Configurações)
export const DEFAULT_ALERT_DAYS = 30
export const ALERT_DAYS = DEFAULT_ALERT_DAYS

export const CATEGORIES = [
  'Alvará de funcionamento', 'Licença Sanitária', 'CRF/CE', 'AVCB',
  'Laudos Ocupacionais', 'Licença Ambiental',
  'PGRS/PGRSS',
  'PCMSO', 'PGR', 'LTCAT', 'ASO', 'Estudos Térmicos',
  'Certificado ISO9001', 'Certificado SASSMAQ', 'CBPF', 'CBPD',
  'IBAMA', 'Polícia Federal', 'Outros'
]

// Validade usual (em meses) usada só como SUGESTÃO de data.
// Prazos que variam por estado/município ficam em branco: cada usuário
// define os seus em Configurações > Validade por categoria.
export const DEFAULT_VALIDITY = {
  'ASO': 12,
  'PCMSO': 12,
  'PGR': 24,
  'Certificado ISO9001': 36,
}

export const STATUS = {
  vencido: { key: 'vencido', label: 'Vencido', exportLabel: 'VENCIDO' },
  alerta: { key: 'alerta', label: 'Em alerta', exportLabel: 'ALERTA' },
  renovacao: { key: 'renovacao', label: 'Em renovação', exportLabel: 'EM RENOVAÇÃO' },
  ok: { key: 'ok', label: 'Em dia', exportLabel: 'Em dia' },
}

export const RENEWAL_STAGES = {
  em_renovacao: 'Em renovação',
  protocolado: 'Protocolado',
  aguardando_vistoria: 'Aguardando vistoria',
}

// Dias até o vencimento, contados a partir do início do dia de hoje
export function getDays(doc) {
  return differenceInDays(parseISO(doc.expiry_date), startOfDay(new Date()))
}

// Um documento já em renovação não aparece como "vencido" nem "alerta"
export function getStatusKey(days, alertDays = DEFAULT_ALERT_DAYS, renewalStatus = null) {
  if (renewalStatus && days <= alertDays) return 'renovacao'
  if (days < 0) return 'vencido'
  if (days <= alertDays) return 'alerta'
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
  if (!iso) return ''
  return format(parseISO(iso), 'dd/MM/yyyy')
}

export function toISODate(date) {
  return format(date, 'yyyy-MM-dd')
}

// Meses de validade da categoria: configuração do usuário > padrão
export function validityFor(category, settings) {
  const custom = settings?.category_validity?.[category]
  if (custom !== undefined && custom !== null && custom !== '') return Number(custom) || null
  return DEFAULT_VALIDITY[category] || null
}

export function suggestExpiry(category, settings, from = new Date()) {
  const months = validityFor(category, settings)
  if (!months) return null
  return { months, date: toISODate(addMonths(from, months)) }
}
