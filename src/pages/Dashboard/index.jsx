import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, parseISO } from 'date-fns'
import emailjs from '@emailjs/browser'

// --- CONFIGURAÇÃO DO EMAILJS (Mantenha os seus dados reais aqui) ---
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

const containerStyle = { width: '100%', maxWidth: '800px', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '30px' }
const cardStyle = { background: '#2a2a2a', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#fff', outline: 'none', fontSize: '14px', width: '100%' }
const buttonPrimaryStyle = { padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }
const modalContentStyle = { background: '#2a2a2a', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }
const tagStyle = { background: '#444', color: '#ddd', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', marginTop: '5px', display: 'inline-block' }
const filterButtonStyle = (active, color) => ({ padding: '8px 16px', background: active ? color : 'transparent', border: `1px solid ${color}`, color: active ? '#fff' : color, borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: '0.2s', flex: '1 1 auto', textAlign: 'center' })

export default function Dashboard() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Estados
  const [newTitle, setNewTitle] = useState(''); const [newDate, setNewDate] = useState('')
  const [newCategory, setNewCategory] = useState(''); const [newFile, setNewFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', date: '', category: '' })
  const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('todos'); const [categoryFilter, setCategoryFilter] = useState('todas')
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => { fetchDocuments() }, [])

  async function fetchDocuments() {
    const { data, error } = await supabase.from('documents').select('*').order('expiry_date', { ascending: true })
    if (error) console.log("Erro:", error)
    else setDocs(data)
    setLoading(false)
  }

  async function handleLogout() { await supabase.auth.signOut(); navigate('/') }

  // --- FUNÇÃO AUXILIAR PARA GERAR O TEXTO DO RELATÓRIO ---
  function generateReportText() {
    const criticalDocs = docs.filter(doc => {
      const days = differenceInDays(parseISO(doc.expiry_date), new Date())
      return days <= 30
    })

    if (criticalDocs.length === 0) return null

    let messageText = "*⚠️ RELATÓRIO DE LICENÇAS E PRAZOS*\n\n"
    
    criticalDocs.forEach(doc => {
      const days = differenceInDays(parseISO(doc.expiry_date), new Date())
      const status = days < 0 ? "🔴 [VENCIDO]" : "🟡 [ALERTA]"
      const dataFormatada = format(parseISO(doc.expiry_date), 'dd/MM/yyyy')
      messageText += `${status} *${doc.title}*\n📂 ${doc.category}\n📅 Vence: ${dataFormatada}\n🔗 Link: ${doc.file_url}\n\n`
    })

    messageText += `--------------------\nTotal de itens críticos: ${criticalDocs.length}`
    return messageText
  }

  // --- EMAIL ---
  async function handleSendEmail() {
    if (!confirm("Enviar relatório por E-mail?")) return;
    setSendingEmail(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const text = generateReportText() // Reutiliza a função de texto
      
      if (!text) {
        alert("Nenhum documento crítico para relatar."); setSendingEmail(false); return;
      }

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
          to_name: "Gestor", message: text, to_email: user.email, reply_to: user.email
        }, PUBLIC_KEY)

      alert(`E-mail enviado para ${user.email}!`)
    } catch (error) { console.error(error); alert("Erro ao enviar e-mail.") } finally { setSendingEmail(false) }
  }

  // --- WHATSAPP (NOVA FUNÇÃO) ---
  function handleShareWhatsapp() {
    const text = generateReportText() // Pega o mesmo texto do e-mail

    if (!text) return alert("Tudo em dia! Nenhum documento para cobrar no WhatsApp.")

    // Codifica o texto para funcionar na URL (transforma espaço em %20, etc)
    const encodedText = encodeURIComponent(text)
    
    // Cria o link. Se deixar sem número, ele abre a lista de contatos para você escolher.
    const whatsappUrl = `https://wa.me/?text=${encodedText}`

    // Abre em nova aba
    window.open(whatsappUrl, '_blank')
  }

  // --- CRUD e Filtros (Mantidos Iguais) ---
  function openEditModal(doc) { setEditingDoc(doc); setEditForm({ title: doc.title, date: doc.expiry_date, category: doc.category || '' }) }
  async function handleUpdate(e) { e.preventDefault(); try { const { error } = await supabase.from('documents').update({ title: editForm.title, expiry_date: editForm.date, category: editForm.category }).eq('id', editingDoc.id); if (error) throw error; alert("Atualizado!"); setEditingDoc(null); fetchDocuments() } catch (error) { alert("Erro: " + error.message) } }
  async function handleUpload(e) { e.preventDefault(); if (!newFile || !newTitle || !newDate || !newCategory) return alert("Preencha tudo!"); setUploading(true); try { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Faça login novamente."); const fileExt = newFile.name.split('.').pop(); const fileName = `${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('file-docs').upload(fileName, newFile); if (uploadError) throw uploadError; const { data: { publicUrl } } = supabase.storage.from('file-docs').getPublicUrl(fileName); const { error: dbError } = await supabase.from('documents').insert([{ title: newTitle, expiry_date: newDate, category: newCategory, file_url: publicUrl, user_id: user.id }]); if (dbError) throw dbError; alert("Salvo!"); setNewTitle(''); setNewDate(''); setNewCategory(''); setNewFile(null); document.getElementById('fileInput').value = ""; fetchDocuments() } catch (error) { alert("Erro: " + error.message) } finally { setUploading(false) } }
  async function handleDelete(id) { if(!confirm("Excluir?")) return; try { const { error } = await supabase.from('documents').delete().match({ id }); if (error) throw error; fetchDocuments() } catch (error) { alert("Erro: " + error.message) } }
  function getStatusColor(expiryDate) { if (!expiryDate) return '#555'; const diff = differenceInDays(parseISO(expiryDate), new Date().setHours(0,0,0,0)); if (diff < 0) return '#ff4d4d'; if (diff <= 30) return '#ffcc00'; return '#4caf50' }
  const filteredDocs = docs.filter(doc => { const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()); const statusColor = getStatusColor(doc.expiry_date); let statusType = 'ok'; if (statusColor === '#ff4d4d') statusType = 'vencidos'; if (statusColor === '#ffcc00') statusType = 'alerta'; const matchesStatus = statusFilter === 'todos' || statusType === statusFilter; const matchesCategory = categoryFilter === 'todas' || doc.category === categoryFilter; return matchesSearch && matchesStatus && matchesCategory })

  return (
    <div style={containerStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '30px' }}>📑</span>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Gestão de Licenças</h1>
        </div>
        
        {/* BOTÕES DE AÇÃO (MOBILE FRIENDLY) */}
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          {/* Botão Email */}
          <button onClick={handleSendEmail} disabled={sendingEmail} style={{background: '#ffcc00', border: 'none', color: '#000', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
            {sendingEmail ? 'Enviando...' : '📧 Email'}
          </button>

          {/* Botão WhatsApp (NOVO) */}
          <button onClick={handleShareWhatsapp} style={{background: '#25D366', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
            📱 WhatsApp
          </button>

          <button onClick={handleLogout} style={{background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}>Sair</button>
        </div>
      </header>

      {/* RESTO DO CÓDIGO (IGUAL AO ANTERIOR) */}
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Novo Documento</h3>
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: '15px' }}>
          <input type="text" placeholder="Nome do documento" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{...inputStyle, flex: 1, minWidth: '150px'}}>
              <option value="">Categoria...</option>{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{...inputStyle, flex: 1, minWidth: '150px'}} />
          </div>
          <input id="fileInput" type="file" onChange={e => setNewFile(e.target.files[0])} style={{ ...inputStyle, padding: '9px' }} />
          <button disabled={uploading} style={buttonPrimaryStyle}>{uploading ? 'Salvando...' : 'Adicionar'}</button>
        </form>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <input type="text" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, background: '#252525', border: '1px solid #444', flex: '2 1 200px' }} />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle, background: '#252525', border: '1px solid #444', flex: '1 1 150px' }}>
              <option value="todas">Todas as Categorias</option>{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['todos', 'vencidos', 'alerta', 'ok'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} style={filterButtonStyle(statusFilter === status, status === 'vencidos' ? '#ff4d4d' : status === 'alerta' ? '#ffcc00' : status === 'ok' ? '#4caf50' : '#888')}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section>
        {loading ? <p style={{textAlign: 'center', color: '#666'}}>Carregando...</p> : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredDocs.map(doc => (
              <div key={doc.id} style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderLeft: `6px solid ${getStatusColor(doc.expiry_date)}`, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <div style={{flex: '1 1 200px'}}>
                  {doc.category && <span style={tagStyle}>{doc.category}</span>}
                  <h4 style={{ margin: '8px 0 5px 0', fontSize: '18px', wordBreak: 'break-word' }}>{doc.title}</h4>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>Vence em: <strong style={{color: '#fff'}}>{format(parseISO(doc.expiry_date), 'dd/MM/yyyy')}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <button onClick={() => openEditModal(doc)} style={{ color: '#ffcc00', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>✏️</button>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#007bff', fontSize: '14px' }}>Visualizar</a>
                  <button onClick={() => handleDelete(doc.id)} style={{ color: '#ff4d4d', border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editingDoc && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Editar Documento</h3>
            <form onSubmit={handleUpdate} style={{display: 'grid', gap: '15px'}}>
              <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} style={inputStyle} />
              <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} style={inputStyle}>
                <option value="">Categoria...</option>{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} style={inputStyle} />
              <div style={{display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap'}}>
                <button type="button" onClick={() => setEditingDoc(null)} style={{...buttonPrimaryStyle, background: '#555'}}>Cancelar</button>
                <button type="submit" style={buttonPrimaryStyle}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}