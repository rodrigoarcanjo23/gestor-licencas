/* eslint-env node */
// scripts/check-vencimentos.js

// Importações
import { createClient } from '@supabase/supabase-js'

// --- CONFIGURAÇÃO PARA RODAR LOCALMENTE (OPCIONAL) ---
// Se você estiver testando no seu PC, precisa carregar as variáveis.
// Se estiver rodando no GitHub Actions, ele ignora isso.
// Para testar local: npm install dotenv
// import dotenv from 'dotenv'
// dotenv.config()
// -----------------------------------------------------

// 1. Configurações (Vêm das Variáveis de Ambiente do GitHub)
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY // Service Role ou Anon Key
const EMAILJS_SERVICE_ID = "service_8ai15im"   // Seu Service ID
const EMAILJS_TEMPLATE_ID = "template_l560mrl" // Seu Template ID
const EMAILJS_PUBLIC_KEY = "9DbkhDMEAB-6WAcjc" // Sua Public Key
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY 

if (!SUPABASE_URL || !SUPABASE_KEY || !EMAILJS_PRIVATE_KEY) {
  console.error("❌ Erro: Variáveis de ambiente faltando.")
  console.error("Verifique se configurou os Secrets no GitHub ou o .env localmente.")
  process.exit(1)
}

// 2. Conectar no Banco
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  console.log('🔄 Iniciando verificação automática...')

  // 3. Calcular Datas (Hoje e Daqui a 30 dias)
  const hoje = new Date()
  const trintaDias = new Date()
  trintaDias.setDate(hoje.getDate() + 30)

  // Formatar para YYYY-MM-DD (Padrão do Banco)
  const hojeStr = hoje.toISOString().split('T')[0]
  const trintaDiasStr = trintaDias.toISOString().split('T')[0]

  console.log(`🔎 Buscando vencimentos entre ${hojeStr} e ${trintaDiasStr}...`)

  // 4. Buscar no Supabase
  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .gte('expiry_date', hojeStr)      
    .lte('expiry_date', trintaDiasStr) 

  if (error) {
    console.error('❌ Erro no Supabase:', error)
    process.exit(1)
  }

  if (!docs || docs.length === 0) {
    console.log('✅ Nenhum documento vencendo nos próximos 30 dias.')
    return
  }

  console.log(`⚠️ Encontrados ${docs.length} documentos. Preparando e-mail...`)

  // 5. Montar o Texto do E-mail
  let messageText = "⚠️ *DOC EM DIA - ALERTA AUTOMÁTICO*\n\nOs seguintes documentos estão próximos do vencimento:\n\n"
  
  docs.forEach(doc => {
    // Tenta formatar a data, se falhar usa a original
    let dataFormatada = doc.expiry_date
    try {
        dataFormatada = new Date(doc.expiry_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})
    } catch (e) { /* ignora erro de data */ }

    messageText += `🟡 ${doc.title}\n📂 ${doc.category}\n📅 Vence em: ${dataFormatada}\n\n----------------\n`
  })

  // 6. Enviar E-mail via API REST
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    accessToken: EMAILJS_PRIVATE_KEY, 
    template_params: {
      to_name: "Renata",
      to_email: "renatadamasceno@gmail.com",
      message: messageText
    }
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })

    if (response.ok) {
        console.log('📧 E-mail enviado com sucesso para a Renata!')
    } else {
        const erroTexto = await response.text()
        console.error('❌ Erro no EmailJS:', erroTexto)
        process.exit(1)
    }
  } catch (err) {
      console.error('❌ Erro de conexão:', err)
      process.exit(1)
  }
}

run()