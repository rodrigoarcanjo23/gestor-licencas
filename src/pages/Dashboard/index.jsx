import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, parseISO } from 'date-fns'
import emailjs from '@emailjs/browser'
import * as XLSX from 'xlsx' 
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem' 
import { FileOpener } from '@capawesome-team/capacitor-file-opener'

// --- 1. CONFIGURAÇÕES FIXAS ---
const CLIENT_EMAIL = "renatadamasceno@gmail.com"
const CLIENT_WHATSAPP = "5585987545011" 

const SERVICE_ID = "service_8ai15im"   
const TEMPLATE_ID = "template_l560mrl" 
const PUBLIC_KEY = "9DbkhDMEAB-6WAcjc" 

const CATEGORIES = [
  "Alvará de funcionamento", "Licença Sanitária", "CRF/CE", "AVCB",
  "Laudos Ocupacionais", "Licença Ambiental", "PGRSS",
  "PCMSO", "PGR", "LTCAT", "ASO", "Estudos Térmicos",
  "Certificado ISO9001", "Certificado SASSMAQ", "CBPF", "CBPD",
  "Outros"
]

// --- 2. ESTILOS (TEMA CLARO - DOC EM DIA) ---
const containerStyle = { 
  width: '100%', 
  minHeight: '100vh', 
  background: '#f4f6f9', // Fundo cinza bem claro
  padding: '40px 20px 80px 20px', 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '25px', 
  fontFamily: 'Arial, sans-serif'
}

const cardStyle = { 
  background: '#ffffff', 
  padding: '25px', 
  borderRadius: '16px', 
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
  border: '1px solid #eee'
}

const inputStyle = { 
  padding: '14px', 
  borderRadius: '10px', 
  border: '1px solid #ddd', 
  background: '#fff', 
  color: '#333', 
  outline: 'none', 
  fontSize: '15px', 
  width: '100%',
  marginBottom: '5px'
}

const labelStyle = { 
  color: '#555', 
  fontSize: '13px', 
  marginBottom: '6px', 
  display: 'block', 
  fontWeight: '600' 
}

const buttonPrimaryStyle = { 
  padding: '14px', 
  background: '#007bff', 
  color: 'white', 
  border: 'none', 
  borderRadius: '10px', 
  cursor: 'pointer', 
  fontWeight: 'bold', 
  fontSize: '16px',
  width: '100%',
  transition: '0.2s'
}

export default function Dashboard() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Estados do formulário
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => { fetchDocuments() }, [])

  async function fetchDocuments() {
    const { data, error } = await supabase.from('documents').select('*').order('expiry_date', { ascending: true })
    if (error) console.log("Erro:", error)
    else setDocs(data || [])
    setLoading(false)
  }

  // --- EXPORTAR EXCEL (HÍBRIDO WEB/NATIVE) ---
  async function handleExportExcel() {
    if (docs.length === 0) return alert("Não há dados para exportar.")

    try {
        setLoading(true) 
        
        // Preparar dados
        const dataToExport = docs.map(doc => {
          const days = differenceInDays(parseISO(doc.expiry_date), new Date())
          let status = "Em dia"
          if (days < 0) status = "VENCIDO"
          else if (days <= 30) status = "ALERTA"

          return {
            "Empresa": doc.title,
            "Categoria": doc.category,
            "Vencimento": format(parseISO(doc.expiry_date), 'dd/MM/yyyy'),
            "Dias Restantes": days,
            "Status": status
          }
        })

        // Criar Planilha
        const worksheet = XLSX.utils.json_to_sheet(dataToExport)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório")
        
        // Ajustar largura colunas
        const wscols = [{wch: 30}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 10}];
        worksheet['!cols'] = wscols;

        // Verificar plataforma (App ou Web)
        if (Capacitor.isNativePlatform()) {
            const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
            const fileName = `Relatorio_${Date.now()}.xlsx`
            
            const result = await Filesystem.writeFile({
                path: fileName,
                data: excelBase64,
                directory: Directory.Cache
            })

            await FileOpener.openFile({
                path: result.uri,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })

        } else {
            // Versão Web (Computador)
            XLSX.writeFile(workbook, `Relatorio_${Date.now()}.xlsx`)
        }

    } catch (error) {
        console.error(error)
        alert("Erro ao abrir o arquivo. Verifique se tem um app de planilhas instalado.")
    } finally {
        setLoading(false)
    }
  }

  // --- GERAR TEXTO DO RELATÓRIO ---
  function generateReportText() {
    const criticalDocs = docs.filter(doc => {
      const days = differenceInDays(parseISO(doc.expiry_date), new Date())
      return days <= 30 
    })

    if (criticalDocs.length === 0) return null

    let messageText = "⚠️ *DOC em dia - Relatório de Vencimentos*\n\n"
    
    criticalDocs.forEach(doc => {
      const days = differenceInDays(parseISO(doc.expiry_date), new Date())
      const status = days < 0 ? "🔴 [VENCIDO]" : "🟡 [ALERTA]"
      const dataFormatada = format(parseISO(doc.expiry_date), 'dd/MM/yyyy')
      
      messageText += `${status} *${doc.title}*\n📂 ${doc.category}\n📅 Vence: ${dataFormatada}\n⏳ Restam: ${days} dias\n\n`
    })
    
    return messageText
  }

  // --- ENVIAR EMAIL ---
  async function handleSendEmail() {
    const text = generateReportText()
    if (!text) return alert("Nenhum documento crítico para enviar.")

    if (!confirm(`Enviar relatório para ${CLIENT_EMAIL}?`)) return;
    
    setSendingEmail(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const templateParams = {
        to_name: "Renata",
        message: text,
        to_email: CLIENT_EMAIL,
        reply_to: user ? user.email : CLIENT_EMAIL
      }
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
      alert(`✅ Sucesso! E-mail enviado.`)
    } catch (error) { 
      console.error(error)
      alert("❌ Erro ao enviar e-mail.") 
    } finally { 
      setSendingEmail(false) 
    }
  }

  // --- COMPARTILHAR WHATSAPP ---
  function handleShareWhatsapp() {
    const text = generateReportText()
    if (!text) return alert("Tudo em dia! Nada para cobrar.")
    const encodedText = encodeURIComponent(text)
    const whatsappUrl = `https://wa.me/${CLIENT_WHATSAPP}?text=${encodedText}`
    window.open(whatsappUrl, '_system') 
  }

  // --- CADASTRO (SALVAR NO BANCO) ---
  async function handleRegister(e) { 
      e.preventDefault(); 
      if (!newTitle || !newDate || !newCategory) return alert("Preencha todos os campos!"); 
      
      setUploading(true); 
      try { 
          const { data: { user } } = await supabase.auth.getUser(); 
          if(!user) throw new Error("Sem usuário logado");
          
          // Inserção simples
          const { error } = await supabase.from('documents').insert([{ 
              title: newTitle, 
              expiry_date: newDate, 
              category: newCategory, 
              user_id: user.id
          }]); 
          
          if (error) throw error; 
          
          alert("✅ Salvo com sucesso!"); 
          setNewTitle(''); setNewDate(''); setNewCategory(''); 
          fetchDocuments() 

      } catch (error) { 
          console.error(error)
          alert("Erro ao salvar: " + error.message) 
      } finally { 
          setUploading(false) 
      } 
  }

  // --- EXCLUIR (CORRIGIDO) ---
  async function handleDelete(id) {
    if(!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id) // <--- MÉTODO CORRETO

        if (error) throw error;

        alert("✅ Documento excluído!");
        fetchDocuments(); // Atualiza a lista

    } catch (error) {
        console.error(error)
        alert("Erro ao excluir: " + error.message)
    }
  }

  async function handleLogout() { await supabase.auth.signOut(); navigate('/') }

  // --- LÓGICA DE FILTROS ---
  const filteredDocs = docs.filter(doc => {
      if(statusFilter === 'todos') return true;
      const days = differenceInDays(parseISO(doc.expiry_date), new Date());
      if(statusFilter === 'vencidos') return days < 0;
      if(statusFilter === 'alerta') return days >= 0 && days <= 30;
      return days > 30;
  }).filter(doc => doc.title.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div style={{...containerStyle, alignItems:'center', justifyContent:'center'}}>Carregando...</div>

  // --- RENDERIZAÇÃO (HTML) ---
  return (
    <div style={containerStyle}>
      
      {/* HEADER: LOGO E BOTÃO SAIR */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px'}}>
         {/* Logo vinda da pasta PUBLIC */}
         <img src="/logo.png" alt="DOC em dia" style={{height: '60px', objectFit: 'contain'}} />
         
         <button onClick={handleLogout} style={{background:'#fff', border:'1px solid #ccc', color:'#d9534f', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer'}}>
            Sair
         </button>
      </div>

      {/* BOTÕES DE AÇÃO RÁPIDA */}
      <div style={{display: 'flex', gap: '10px'}}>
        <button onClick={handleExportExcel} style={{...buttonPrimaryStyle, background: '#1D6F42', fontSize:'14px', flex:1}}>
          📊 Excel
        </button>
        <button onClick={handleSendEmail} disabled={sendingEmail} style={{...buttonPrimaryStyle, background: '#FFC107', color:'#000', fontSize:'14px', flex:1}}>
          {sendingEmail ? '...' : '📧 Email'}
        </button>
        <button onClick={handleShareWhatsapp} style={{...buttonPrimaryStyle, background: '#25D366', fontSize:'14px', flex:1}}>
          📱 Zap
        </button>
      </div>

      {/* FORMULÁRIO DE CADASTRO */}
      <section style={cardStyle}>
        <h3 style={{marginTop:0, color:'#333', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>Novo Documento</h3>
        <form onSubmit={handleRegister} style={{display:'grid', gap:'15px'}}>
            
            <div>
              <label style={labelStyle}>Nome da Empresa</label>
              <input placeholder="Ex: Padaria Estrela" value={newTitle} onChange={e=>setNewTitle(e.target.value)} style={inputStyle}/>
            </div>

            <div style={{display:'flex', gap:'10px'}}>
                <div style={{flex: 1}}>
                  <label style={labelStyle}>Categoria</label>
                  <select value={newCategory} onChange={e=>setNewCategory(e.target.value)} style={inputStyle}>
                      <option value="">Selecione...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{flex: 1}}>
                  <label style={labelStyle}>Vencimento</label>
                  <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={inputStyle}/>
                </div>
            </div>
            
            <button disabled={uploading} style={buttonPrimaryStyle}>{uploading ? 'Salvando...' : 'Adicionar'}</button>
        </form>
      </section>

      {/* FILTROS E BUSCA */}
      <section style={{display:'flex', gap:'10px'}}>
        <input placeholder="🔍 Buscar empresa..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle, marginBottom:0, flex: 2}} />
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inputStyle, marginBottom:0, flex: 1}}>
            <option value="todos">Todos</option>
            <option value="vencidos">Vencidos</option>
            <option value="alerta">Alerta</option>
            <option value="ok">Em dia</option>
        </select>
      </section>

      {/* LISTA DE DOCUMENTOS */}
      <section>
          <h3 style={{color:'#666', fontSize:'14px', marginBottom:'15px'}}>Documentos Cadastrados ({filteredDocs.length})</h3>
          <div style={{display:'grid', gap:'15px'}}>
              {filteredDocs.map(doc => {
                  const days = differenceInDays(parseISO(doc.expiry_date), new Date());
                  
                  // Lógica Visual dos Cards (Cores)
                  let borderColor = '#28a745'; // Verde
                  let statusText = 'Em dia';
                  let statusColor = '#28a745';

                  if (days < 0) {
                      borderColor = '#dc3545'; // Vermelho
                      statusText = 'VENCIDO';
                      statusColor = '#dc3545';
                  } else if (days <= 30) {
                      borderColor = '#ffc107'; // Amarelo
                      statusText = 'ALERTA';
                      statusColor = '#d39e00';
                  }

                  return (
                    <div key={doc.id} style={{background: '#fff', padding: '15px', borderRadius: '12px', borderLeft: `6px solid ${borderColor}`, boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                            <div>
                                <strong style={{fontSize:'16px', color:'#333'}}>{doc.title}</strong>
                                <div style={{color:'#666', fontSize:'13px', marginTop:'2px'}}>{doc.category}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                                <div style={{fontWeight:'bold', color: statusColor, fontSize:'12px'}}>{statusText}</div>
                                <div style={{fontSize:'14px', color:'#333'}}>{format(parseISO(doc.expiry_date), 'dd/MM/yyyy')}</div>
                            </div>
                        </div>
                        
                        <div style={{marginTop:'12px', paddingTop:'10px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent: 'flex-end'}}>
                            <button onClick={() => handleDelete(doc.id)} style={{background:'transparent', border:'none', color:'#999', cursor:'pointer', fontSize:'13px'}}>🗑️ Excluir</button>
                        </div>
                    </div>
                  )
              })}
          </div>
      </section>
    </div>
  )
}