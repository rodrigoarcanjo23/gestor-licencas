/* eslint-env node */
// =====================================================================
// DOC em dia — Robô de alertas diários (GitHub Actions, todo dia às 8h)
//
// Para CADA usuário:
//   - lê as configurações dele (tabela user_settings)
//   - monta a lista de documentos vencidos / em alerta / em renovação
//   - envia o e-mail conforme o modo escolhido:
//       "etapas" → só quando algum documento chega a um marco (60, 30, 15, 7 dias, no dia...)
//                  + lembrete dos vencidos toda segunda-feira
//       "diario" → todo dia enquanto houver pendências
//
// Variáveis (Secrets do GitHub):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (obrigatória: lê todos os usuários)
//   EMAILJS_PRIVATE_KEY
// Teste sem enviar e-mail: DRY_RUN=1 node scripts/check-vencimentos.js
// =====================================================================
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY
const EMAILJS = {
  service_id: process.env.EMAILJS_SERVICE_ID || 'service_8ai15im',
  template_id: process.env.EMAILJS_TEMPLATE_ID || 'template_l560mrl',
  user_id: process.env.EMAILJS_PUBLIC_KEY || '9DbkhDMEAB-6WAcjc',
}
const DRY_RUN = !!process.env.DRY_RUN
const TIMEZONE = 'America/Sao_Paulo'

const DEFAULTS = {
  alert_days: 30,
  email_enabled: true,
  notify_mode: 'etapas',
  notify_steps: [60, 30, 15, 7, 0],
}
const STAGES = { em_renovacao: 'Em renovação', protocolado: 'Protocolado', aguardando_vistoria: 'Aguardando vistoria' }

if (!SUPABASE_URL || !SERVICE_KEY || (!EMAILJS_PRIVATE_KEY && !DRY_RUN)) {
  console.error('❌ Variáveis faltando: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e EMAILJS_PRIVATE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// --- Datas no fuso de Brasília -----------------------------------------
const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date()) // AAAA-MM-DD
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).format(new Date())
const utc = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) }
const daysUntil = (iso) => Math.round((utc(iso) - utc(todayISO)) / 864e5)
const br = (iso) => iso.slice(0, 10).split('-').reverse().join('/')

async function fetchAll(table, columns = '*') {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

function buildMessage(name, s, groups, newToday) {
  const lines = []
  lines.push(`Olá${name ? `, ${name}` : ''}! Este é o resumo de vencimentos de hoje (${br(todayISO)}).`)
  if (s.office_name) lines.push(s.office_name)
  lines.push('')

  const item = (d) => {
    const mark = newToday.has(d.id) ? ' ← novo aviso' : ''
    const when = d.days < 0 ? `venceu há ${-d.days} dia(s)` : d.days === 0 ? 'vence HOJE' : `vence em ${d.days} dia(s)`
    let t = `• ${d.title} — ${d.category}\n   ${br(d.expiry_date)} (${when})${mark}`
    if (d.renewal_status) t += `\n   Renovação: ${STAGES[d.renewal_status] || d.renewal_status}`
    if (d.observation) t += `\n   Obs: ${d.observation}`
    return t
  }

  if (groups.vencido.length) lines.push(`🔴 VENCIDOS (${groups.vencido.length})`, ...groups.vencido.map(item), '')
  if (groups.alerta.length) lines.push(`🟡 VENCEM EM ATÉ ${s.alert_days} DIAS (${groups.alerta.length})`, ...groups.alerta.map(item), '')
  if (groups.renovacao.length) lines.push(`🔵 EM RENOVAÇÃO (${groups.renovacao.length})`, ...groups.renovacao.map(item), '')
  lines.push('Acesse o DOC em dia para ver os detalhes e atualizar as renovações.')
  lines.push('(Para mudar a frequência destes e-mails: Configurações > Alertas)')
  return lines.join('\n')
}

async function sendEmail(to_email, to_name, message, subject) {
  if (DRY_RUN) {
    console.log(`\n----- [DRY_RUN] para ${to_email} -----\n${message}\n`)
    return
  }
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...EMAILJS,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: { to_email, to_name, message, subject, reply_to: to_email },
    }),
  })
  if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text()}`)
}

async function run() {
  console.log(`🔄 Verificação de ${br(todayISO)} (${weekday})`)

  const docs = await fetchAll('documents', 'id,user_id,title,category,expiry_date,observation,renewal_status')
  let settingsRows = []
  try { settingsRows = await fetchAll('user_settings') }
  catch (e) { console.warn('⚠️ Tabela user_settings indisponível (rode a migração SQL). Usando padrões.', e.message) }
  const settingsByUser = Object.fromEntries(settingsRows.map((s) => [s.user_id, s]))

  const byUser = new Map()
  for (const d of docs) {
    if (!d.user_id || !d.expiry_date) continue
    if (!byUser.has(d.user_id)) byUser.set(d.user_id, [])
    byUser.get(d.user_id).push({ ...d, days: daysUntil(d.expiry_date) })
  }

  let sent = 0, skipped = 0, failed = 0
  for (const [userId, list] of byUser) {
    const s = { ...DEFAULTS, ...(settingsByUser[userId] || {}) }
    if (!s.email_enabled) { skipped++; continue }

    let to = s.report_email
    if (!to) {
      const { data } = await supabase.auth.admin.getUserById(userId)
      to = data?.user?.email
    }
    if (!to) { console.warn(`⚠️ Usuário ${userId} sem e-mail.`); skipped++; continue }

    const groups = { vencido: [], alerta: [], renovacao: [] }
    for (const d of list.sort((a, b) => a.days - b.days)) {
      if (d.renewal_status && d.days <= s.alert_days) groups.renovacao.push(d)
      else if (d.days < 0) groups.vencido.push(d)
      else if (d.days <= s.alert_days) groups.alerta.push(d)
    }
    const total = groups.vencido.length + groups.alerta.length + groups.renovacao.length
    if (total === 0) { skipped++; continue }

    // Documentos que chegam hoje a um marco configurado (não conta os já em renovação)
    const steps = new Set((s.notify_steps || DEFAULTS.notify_steps).map(Number))
    const newToday = new Set(list.filter((d) => !d.renewal_status && steps.has(d.days)).map((d) => d.id))
    const mondayOverdue = weekday === 'Mon' && groups.vencido.length > 0

    const shouldSend = s.notify_mode === 'diario' || newToday.size > 0 || mondayOverdue
    if (!shouldSend) { skipped++; continue }

    const subject = groups.vencido.length
      ? `DOC em dia: ${groups.vencido.length} vencido(s) e ${groups.alerta.length} a vencer`
      : `DOC em dia: ${groups.alerta.length + groups.renovacao.length} documento(s) a vencer`
    try {
      await sendEmail(to, s.report_name || '', buildMessage(s.report_name, s, groups, newToday), subject)
      console.log(`📧 ${to}: ${total} pendência(s), ${newToday.size} novo(s) aviso(s)`)
      sent++
    } catch (e) {
      console.error(`❌ Falha ao enviar para ${to}:`, e.message)
      failed++
    }
  }

  console.log(`✅ Fim: ${sent} e-mail(s) enviado(s), ${skipped} usuário(s) sem envio hoje, ${failed} falha(s).`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => { console.error('❌ Erro geral:', e); process.exit(1) })
