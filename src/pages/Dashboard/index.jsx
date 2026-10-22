import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import emailjs from '@emailjs/browser'
import {
  FiPlus, FiSearch, FiLayers, FiAlertTriangle, FiClock, FiCheckCircle, FiRefreshCw,
  FiFileText, FiMail, FiInbox, FiUploadCloud, FiX, FiSettings,
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

import StatCard from '../../components/StatCard'
import DocumentCard from '../../components/DocumentCard'
import DocumentForm from '../../components/DocumentForm'
import RenewForm from '../../components/RenewForm'
import ImportForm from '../../components/ImportForm'
import Modal from '../../components/Modal'
import SidebarSlot from '../../components/SidebarSlot'
import { useAppData } from '../../context/AppData'
import { CATEGORIES, formatDate } from '../../utils/status'
import { exportDocuments } from '../../utils/excel'
import { whatsappLink, openExternal } from '../../utils/format'
import { EMAILJS } from '../../config'

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'vencido', label: 'Vencidos' },
  { key: 'alerta', label: 'Alerta' },
  { key: 'renovacao', label: 'Em renovação' },
  { key: 'ok', label: 'Em dia' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const {
    items, docs, companiesById, settings, hasSettings, alertDays, loading, user,
    push, confirm, deleteDocument,
  } = useAppData()

  const [modal, setModal] = useState(null) // { type: 'new'|'edit'|'renew'|'import', doc? }
  const [exporting, setExporting] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('')
  const companyFilter = params.get('empresa') || ''

  const counts = useMemo(() => {
    const c = { todos: items.length, vencido: 0, alerta: 0, renovacao: 0, ok: 0 }
    items.forEach((e) => { c[e.statusKey] += 1 })
    return c
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((e) =>
      (statusFilter === 'todos' || e.statusKey === statusFilter) &&
      (!categoryFilter || e.doc.category === categoryFilter) &&
      (!companyFilter || e.doc.company_id === companyFilter) &&
      (!q || e.doc.title.toLowerCase().includes(q) || e.doc.category.toLowerCase().includes(q))
    )
  }, [items, search, statusFilter, categoryFilter, companyFilter])

  const critical = useMemo(() => items.filter((e) => e.statusKey === 'vencido' || e.statusKey === 'alerta' || e.statusKey === 'renovacao'), [items])

  // --- Relatórios ------------------------------------------------------
  async function handleExportExcel() {
    if (docs.length === 0) return push('Não há dados para exportar.', 'info')
    setExporting(true)
    try {
      await exportDocuments(filtered.length ? filtered : items, companiesById)
      push('Planilha gerada com sucesso.')
    } catch (e) {
      console.error(e)
      push('Erro ao gerar a planilha.', 'error')
    } finally {
      setExporting(false)
    }
  }

  function generateReportText() {
    if (critical.length === 0) return null
    let text = `⚠️ *DOC em dia - Relatório de Vencimentos*${settings.office_name ? `\n${settings.office_name}` : ''}\n\n`
    critical.forEach(({ doc, statusKey }) => {
      const tag = statusKey === 'vencido' ? '🔴 [VENCIDO]' : statusKey === 'renovacao' ? '🔵 [EM RENOVAÇÃO]' : '🟡 [ALERTA]'
      text += `${tag} *${doc.title}*\n📂 ${doc.category}\n📅 Vence: ${formatDate(doc.expiry_date)}\n`
      if (doc.observation) text += `📝 Obs: ${doc.observation}\n`
      text += '\n'
    })
    return text
  }

  const goSettings = useCallback((msg) => {
    push(msg, 'info')
    navigate('/configuracoes')
  }, [push, navigate])

  function handleSendEmail() {
    if (!settings.report_email) return goSettings('Informe o e-mail que recebe os relatórios.')
    const text = generateReportText()
    if (!text) return push('Nenhum documento crítico para enviar.', 'info')
    confirm({
      title: 'Enviar relatório por e-mail',
      message: `O relatório com ${critical.length} documento(s) será enviado para ${settings.report_email}.`,
      confirmLabel: 'Enviar',
      onConfirm: async () => {
        setSendingEmail(true)
        try {
          await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
            to_name: settings.report_name || settings.report_email,
            message: text,
            to_email: settings.report_email,
            reply_to: user?.email || settings.report_email,
          }, EMAILJS.publicKey)
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
    if (!settings.report_whatsapp) return goSettings('Informe o WhatsApp que recebe os relatórios.')
    const text = generateReportText()
    if (!text) return push('Tudo em dia! Nenhum documento crítico.', 'info')
    openExternal(whatsappLink(settings.report_whatsapp, text))
  }

  const closeModal = useCallback(() => setModal(null), [])
  const openNew = () => setModal({ type: 'new' })

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const filteredCompany = companyFilter ? companiesById[companyFilter] : null

  const reportActions = [
    { key: 'excel', label: 'Exportar Excel', short: 'Excel', icon: FiFileText, tone: 'excel', onClick: handleExportExcel, busy: exporting },
    { key: 'email', label: 'Enviar por e-mail', short: 'E-mail', icon: FiMail, tone: 'email', onClick: handleSendEmail, busy: sendingEmail },
    { key: 'zap', label: 'Enviar no WhatsApp', short: 'WhatsApp', icon: FaWhatsapp, tone: 'zap', onClick: handleShareWhatsapp },
    { key: 'import', label: 'Importar planilha', short: 'Importar', icon: FiUploadCloud, tone: 'import', onClick: () => setModal({ type: 'import' }) },
  ]

  const modalTitles = {
    new: ['Novo documento', 'Cadastre uma licença, laudo ou certificado para acompanhar o vencimento.'],
    edit: ['Editar documento', 'Atualize os dados, a data ou o anexo do documento.'],
    renew: ['Renovação', modal?.doc ? `${modal.doc.title} · ${modal.doc.category}` : ''],
    import: ['Importar planilha', 'Traga todos os documentos de uma vez a partir do Excel.'],
  }

  return (
    <>
      <SidebarSlot>
        <button type="button" className="btn btn--primary btn--block" onClick={openNew}>
          <FiPlus /> Novo documento
        </button>
        <div className="sidebar__section">
          <span className="sidebar__heading">Relatórios</span>
          {reportActions.map(({ key, label, icon: Icon, tone, onClick, busy }) => (
            <button key={key} type="button" className="side-link" onClick={onClick} disabled={busy}>
              <span className={`side-link__icon tone-${tone}`}><Icon /></span>
              {busy ? 'Aguarde...' : label}
            </button>
          ))}
        </div>
      </SidebarSlot>

      <div className="page-head">
        <div>
          <h1>Painel de vencimentos</h1>
          <p className="page-head__date">{today}</p>
        </div>
        <label className="search">
          <FiSearch aria-hidden="true" />
          <input type="search" placeholder="Buscar empresa ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {!loading && (!hasSettings || !settings.report_email) && (
        <div className="banner">
          <FiSettings aria-hidden="true" />
          <div>
            <strong>Configure seus alertas</strong>
            <span>Defina quem recebe os relatórios por e-mail e WhatsApp e com quantos dias de antecedência.</span>
          </div>
          <Link to="/configuracoes" className="btn btn--sm btn--primary">Configurar</Link>
        </div>
      )}

      <div className="quick-actions">
        {reportActions.map(({ key, short, icon: Icon, tone, onClick, busy }) => (
          <button key={key} type="button" className={`quick-btn tone-${tone}`} onClick={onClick} disabled={busy}>
            <Icon /> {busy ? '...' : short}
          </button>
        ))}
      </div>

      <section className="stats stats--5" aria-label="Resumo">
        <StatCard icon={FiLayers} label="Total" value={counts.todos} total={counts.todos} tone="neutral"
          active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')} />
        <StatCard icon={FiAlertTriangle} label="Vencidos" value={counts.vencido} total={counts.todos} tone="danger"
          active={statusFilter === 'vencido'} onClick={() => setStatusFilter('vencido')} />
        <StatCard icon={FiClock} label={`Vencem em ${alertDays} dias`} value={counts.alerta} total={counts.todos} tone="warning"
          active={statusFilter === 'alerta'} onClick={() => setStatusFilter('alerta')} />
        <StatCard icon={FiRefreshCw} label="Em renovação" value={counts.renovacao} total={counts.todos} tone="info"
          active={statusFilter === 'renovacao'} onClick={() => setStatusFilter('renovacao')} />
        <StatCard icon={FiCheckCircle} label="Em dia" value={counts.ok} total={counts.todos} tone="success"
          active={statusFilter === 'ok'} onClick={() => setStatusFilter('ok')} />
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>
            Documentos <span className="badge">{filtered.length}</span>
            {filteredCompany && (
              <button type="button" className="filter-chip" onClick={() => setParams({})} title="Remover filtro">
                {filteredCompany.name} <FiX />
              </button>
            )}
          </h2>
          <div className="panel__filters">
            <div className="segmented" role="tablist" aria-label="Status">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" role="tab" aria-selected={statusFilter === f.key}
                  className={statusFilter === f.key ? 'is-active' : ''} onClick={() => setStatusFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
            <select className="input input--sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filtrar por categoria">
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
                ? 'Cadastre o primeiro documento ou importe sua planilha para começar.'
                : 'Tente ajustar a busca ou os filtros.'}
            </span>
            {docs.length === 0 && (
              <div className="empty__actions">
                <button type="button" className="btn btn--primary" onClick={openNew}><FiPlus /> Novo documento</button>
                <button type="button" className="btn btn--ghost" onClick={() => setModal({ type: 'import' })}><FiUploadCloud /> Importar planilha</button>
              </div>
            )}
          </div>
        ) : (
          <div className="doc-grid">
            {filtered.map(({ doc, days, statusKey, company }) => (
              <DocumentCard key={doc.id} doc={doc} days={days} statusKey={statusKey} company={company}
                onEdit={(d) => setModal({ type: 'edit', doc: d })}
                onRenew={(d) => setModal({ type: 'renew', doc: d })}
                onDelete={deleteDocument} />
            ))}
          </div>
        )}
      </section>

      <button type="button" className="fab" onClick={openNew} aria-label="Novo documento">
        <FiPlus />
      </button>

      <Modal open={!!modal} onClose={closeModal} title={modalTitles[modal?.type]?.[0]} subtitle={modalTitles[modal?.type]?.[1]}
        size={modal?.type === 'import' ? 'lg' : 'md'}>
        {(modal?.type === 'new' || modal?.type === 'edit') && (
          <DocumentForm key={modal.doc?.id ?? 'novo'} initial={modal.doc || null}
            defaultCompanyId={companyFilter} onDone={closeModal} onCancel={closeModal} />
        )}
        {modal?.type === 'renew' && <RenewForm key={modal.doc.id} doc={modal.doc} onDone={closeModal} />}
        {modal?.type === 'import' && <ImportForm onDone={closeModal} onCancel={closeModal} />}
      </Modal>
    </>
  )
}
