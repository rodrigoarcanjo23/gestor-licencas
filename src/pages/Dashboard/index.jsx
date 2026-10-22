import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import emailjs from '@emailjs/browser'
import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  FiPlus, FiSearch, FiLogOut, FiLayers, FiAlertTriangle, FiClock, FiCheckCircle,
  FiFileText, FiMail, FiInbox,
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

import logo from '../../assets/logo.png'
import StatCard from '../../components/StatCard'
import DocumentCard from '../../components/DocumentCard'
import DocumentForm from '../../components/DocumentForm'
import Modal from '../../components/Modal'
import ThemeToggle from '../../components/ThemeToggle'
import { useToasts, ToastStack } from '../../components/Toasts'
import { CATEGORIES, STATUS, ALERT_DAYS, getDays, getStatusKey, formatDate } from '../../utils/status'
import './dashboard.css'

// --- CONFIGURAÇÕES ---
const CLIENT_EMAIL = 'renatadamasceno@gmail.com'
const CLIENT_WHATSAPP = '5585987545011'
const SERVICE_ID = 'service_8ai15im'
const TEMPLATE_ID = 'template_l560mrl'
const PUBLIC_KEY = '9DbkhDMEAB-6WAcjc'

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'vencido', label: 'Vencidos' },
  { key: 'alerta', label: 'Alerta' },
  { key: 'ok', label: 'Em dia' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { toasts, push } = useToasts()

  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    fetchDocuments()
    requestNotificationPermission()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email || ''))
  }, [])

  // --- NOTIFICAÇÕES (somente Android) ---
  async function requestNotificationPermission() {
    if (Capacitor.isNativePlatform()) {
      const perm = await LocalNotifications.requestPermissions()
      if (perm.display !== 'granted') console.log('Permissão de notificação negada')
    }
  }

  async function scheduleAlerts(documents) {
    if (!Capacitor.isNativePlatform()) return
    const critical = documents.filter((d) => getDays(d) <= ALERT_DAYS)
    if (critical.length === 0) return
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] })
    await LocalNotifications.schedule({
      notifications: [{
        title: '⚠️ Atenção DOC em dia!',
        body: `Você tem ${critical.length} documentos vencendo ou em alerta. Verifique agora!`,
        id: 1,
        schedule: { at: new Date(Date.now() + 1000) },
        sound: null, attachments: null, actionTypeId: '', extra: null,
      }],
    })
  }

  async function fetchDocuments() {
    const { data, error } = await supabase.from('documents').select('*').order('expiry_date', { ascending: true })
    if (error) {
      console.log('Erro:', error)
      push('Não foi possível carregar os documentos.', 'error')
    } else {
      setDocs(data || [])
      scheduleAlerts(data || [])
    }
    setLoading(false)
  }

  // Documentos enriquecidos com dias restantes e status
  const enriched = useMemo(() => docs.map((doc) => {
    const days = getDays(doc)
    return { doc, days, statusKey: getStatusKey(days) }
  }), [docs])

  const counts = useMemo(() => {
    const c = { todos: enriched.length, vencido: 0, alerta: 0, ok: 0 }
    enriched.forEach((e) => { c[e.statusKey] += 1 })
    return c
  }, [enriched])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((e) =>
      (statusFilter === 'todos' || e.statusKey === statusFilter) &&
      (!categoryFilter || e.doc.category === categoryFilter) &&
      (!q || e.doc.title.toLowerCase().includes(q))
    )
  }, [enriched, search, statusFilter, categoryFilter])

  // --- EXCEL ---
  async function handleExportExcel() {
    if (docs.length === 0) return push('Não há dados para exportar.', 'info')
    try {
      setExporting(true)
      const dataToExport = enriched.map(({ doc, days, statusKey }) => ({
        'Empresa': doc.title,
        'Categoria': doc.category,
        'Observação': doc.observation || '',
        'Vencimento': formatDate(doc.expiry_date),
        'Dias Restantes': days,
        'Status': STATUS[statusKey].exportLabel,
      }))
      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório')
      worksheet['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }]
      const fileName = `Relatorio_${Date.now()}.xlsx`
      if (Capacitor.isNativePlatform()) {
        const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
        const result = await Filesystem.writeFile({ path: fileName, data: excelBase64, directory: Directory.Cache })
        await FileOpener.openFile({ path: result.uri, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      } else {
        XLSX.writeFile(workbook, fileName)
        push('Planilha gerada com sucesso.')
      }
    } catch (error) {
      console.error(error)
      push('Erro ao gerar a planilha.', 'error')
    } finally {
      setExporting(false)
    }
  }

  // --- RELATÓRIO (E-MAIL / WHATSAPP) ---
  function generateReportText() {
    const critical = enriched.filter((e) => e.days <= ALERT_DAYS)
    if (critical.length === 0) return null
    let text = '⚠️ *DOC em dia - Relatório de Vencimentos*\n\n'
    critical.forEach(({ doc, days }) => {
      const status = days < 0 ? '🔴 [VENCIDO]' : '🟡 [ALERTA]'
      text += `${status} *${doc.title}*\n📂 ${doc.category}\n📅 Vence: ${formatDate(doc.expiry_date)}\n`
      if (doc.observation) text += `📝 Obs: ${doc.observation}\n`
      text += '\n'
    })
    return text
  }

  function handleSendEmail() {
    const text = generateReportText()
    if (!text) return push('Nenhum documento crítico para enviar.', 'info')
    setConfirmState({
      title: 'Enviar relatório por e-mail',
      message: `O relatório de vencimentos será enviado para ${CLIENT_EMAIL}.`,
      confirmLabel: 'Enviar',
      tone: 'primary',
      onConfirm: async () => {
        setSendingEmail(true)
        try {
          const { data: { user } } = await supabase.auth.getUser()
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
            to_name: 'Renata', message: text, to_email: CLIENT_EMAIL, reply_to: user ? user.email : CLIENT_EMAIL,
          }, PUBLIC_KEY)
          push('E-mail enviado com sucesso!')
        } catch (error) {
          console.error(error)
          push('Erro ao enviar e-mail.', 'error')
        } finally {
          setSendingEmail(false)
        }
      },
    })
  }

  function handleShareWhatsapp() {
    const text = generateReportText()
    if (!text) return push('Tudo em dia! Nenhum documento crítico.', 'info')
    window.open(`https://wa.me/${CLIENT_WHATSAPP}?text=${encodeURIComponent(text)}`, '_system')
  }

  // --- CRUD ---
  function openNew() { setEditingDoc(null); setFormOpen(true) }
  function openEdit(doc) { setEditingDoc(doc); setFormOpen(true) }

  async function handleSave(values) {
    setSaving(true)
    try {
      if (editingDoc) {
        const { error } = await supabase.from('documents').update(values).eq('id', editingDoc.id)
        if (error) throw error
        push('Documento atualizado!')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Sem usuário logado')
        const { error } = await supabase.from('documents').insert([{ ...values, user_id: user.id }])
        if (error) throw error
        push('Documento salvo!')
      }
      setFormOpen(false)
      setEditingDoc(null)
      fetchDocuments()
      return true
    } catch (error) {
      console.error(error)
      push('Erro ao salvar: ' + error.message, 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(doc) {
    setConfirmState({
      title: 'Excluir documento',
      message: `Tem certeza que deseja excluir "${doc.title}" (${doc.category})? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('documents').delete().eq('id', doc.id)
          if (error) throw error
          push('Documento excluído.')
          fetchDocuments()
        } catch (error) {
          console.error(error)
          push('Erro: ' + error.message, 'error')
        }
      },
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const closeForm = useCallback(() => { setFormOpen(false); setEditingDoc(null) }, [])
  const closeConfirm = useCallback(() => setConfirmState(null), [])

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const initial = (userEmail[0] || 'U').toUpperCase()

  const reportActions = [
    { key: 'excel', label: 'Exportar Excel', short: 'Excel', icon: FiFileText, tone: 'excel', onClick: handleExportExcel, busy: exporting },
    { key: 'email', label: 'Enviar por e-mail', short: 'E-mail', icon: FiMail, tone: 'email', onClick: handleSendEmail, busy: sendingEmail },
    { key: 'zap', label: 'Enviar no WhatsApp', short: 'WhatsApp', icon: FaWhatsapp, tone: 'zap', onClick: handleShareWhatsapp },
  ]

  return (
    <div className="app-shell">
      {/* ===== SIDEBAR (desktop) ===== */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src={logo} alt="DOC em dia" />
          <div>
            <strong>DOC em dia</strong>
            <span>Gestão de vencimentos</span>
          </div>
        </div>

        <button type="button" className="btn btn--primary btn--block" onClick={openNew}>
          <FiPlus /> Novo documento
        </button>

        <nav className="sidebar__section" aria-label="Filtrar por status">
          <span className="sidebar__heading">Status</span>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`side-link${statusFilter === f.key ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              <span className={`side-link__dot is-${f.key}`} />
              {f.label}
              <span className="side-link__count">{counts[f.key]}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__section">
          <span className="sidebar__heading">Relatórios</span>
          {reportActions.map(({ key, label, icon: Icon, tone, onClick, busy }) => (
            <button key={key} type="button" className="side-link" onClick={onClick} disabled={busy}>
              <span className={`side-link__icon tone-${tone}`}><Icon /></span>
              {busy ? 'Aguarde...' : label}
            </button>
          ))}
        </div>

        <ThemeToggle withLabel className="sidebar__theme" />

        <div className="sidebar__user">
          <span className="avatar">{initial}</span>
          <div className="sidebar__user-info">
            <strong>{userEmail ? userEmail.split('@')[0] : 'Usuário'}</strong>
            <span title={userEmail}>{userEmail}</span>
          </div>
          <button type="button" className="icon-btn" onClick={handleLogout} title="Sair" aria-label="Sair">
            <FiLogOut />
          </button>
        </div>
      </aside>

      {/* ===== CONTEÚDO ===== */}
      <main className="main">
        {/* Topo (mobile / tablet) */}
        <header className="topbar">
          <img src={logo} alt="DOC em dia" />
          <div className="topbar__actions">
            <ThemeToggle />
            <button type="button" className="btn btn--outline-danger btn--sm" onClick={handleLogout}>
              <FiLogOut /> Sair
            </button>
          </div>
        </header>

        <div className="page-head">
          <div>
            <h1>Painel de vencimentos</h1>
            <p className="page-head__date">{today}</p>
          </div>
          <label className="search">
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {/* Ações rápidas (mobile / tablet) */}
        <div className="quick-actions">
          {reportActions.map(({ key, short, icon: Icon, tone, onClick, busy }) => (
            <button key={key} type="button" className={`quick-btn tone-${tone}`} onClick={onClick} disabled={busy}>
              <Icon /> {busy ? '...' : short}
            </button>
          ))}
        </div>

        <section className="stats" aria-label="Resumo">
          <StatCard icon={FiLayers} label="Total" value={counts.todos} total={counts.todos} tone="neutral"
            active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')} />
          <StatCard icon={FiAlertTriangle} label="Vencidos" value={counts.vencido} total={counts.todos} tone="danger"
            active={statusFilter === 'vencido'} onClick={() => setStatusFilter('vencido')} />
          <StatCard icon={FiClock} label={`Vencem em ${ALERT_DAYS} dias`} value={counts.alerta} total={counts.todos} tone="warning"
            active={statusFilter === 'alerta'} onClick={() => setStatusFilter('alerta')} />
          <StatCard icon={FiCheckCircle} label="Em dia" value={counts.ok} total={counts.todos} tone="success"
            active={statusFilter === 'ok'} onClick={() => setStatusFilter('ok')} />
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>
              Documentos <span className="badge">{filtered.length}</span>
            </h2>
            <div className="panel__filters">
              <div className="segmented" role="tablist" aria-label="Status">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === f.key}
                    className={statusFilter === f.key ? 'is-active' : ''}
                    onClick={() => setStatusFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                className="input input--sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filtrar por categoria"
              >
                <option value="">Todas as categorias</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="doc-grid">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="doc-card skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <FiInbox aria-hidden="true" />
              <strong>Nenhum documento encontrado</strong>
              <span>
                {docs.length === 0
                  ? 'Cadastre o primeiro documento para começar a acompanhar os vencimentos.'
                  : 'Tente ajustar a busca ou os filtros.'}
              </span>
              {docs.length === 0 && (
                <button type="button" className="btn btn--primary" onClick={openNew}>
                  <FiPlus /> Novo documento
                </button>
              )}
            </div>
          ) : (
            <div className="doc-grid">
              {filtered.map(({ doc, days, statusKey }) => (
                <DocumentCard key={doc.id} doc={doc} days={days} statusKey={statusKey}
                  onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Botão flutuante (mobile / tablet) */}
      <button type="button" className="fab" onClick={openNew} aria-label="Novo documento">
        <FiPlus />
      </button>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingDoc ? 'Editar documento' : 'Novo documento'}
        subtitle={editingDoc
          ? 'Atualize os dados ou a nova data de vencimento após a renovação.'
          : 'Cadastre uma licença, laudo ou certificado para acompanhar o vencimento.'}
      >
        <DocumentForm
          key={editingDoc?.id ?? 'novo'}
          initial={editingDoc}
          onSubmit={handleSave}
          onCancel={closeForm}
          saving={saving}
        />
      </Modal>

      <Modal open={!!confirmState} onClose={closeConfirm} title={confirmState?.title} size="sm">
        <p className="confirm__text">{confirmState?.message}</p>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={closeConfirm}>Cancelar</button>
          <button
            type="button"
            className={`btn ${confirmState?.tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn() }}
          >
            {confirmState?.confirmLabel}
          </button>
        </div>
      </Modal>

      <ToastStack toasts={toasts} />
    </div>
  )
}
