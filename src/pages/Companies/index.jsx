import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch, FiBriefcase, FiPhone, FiMail, FiUser, FiEdit2, FiTrash2, FiArrowRight, FiInbox } from 'react-icons/fi'
import { useAppData } from '../../context/AppData'
import CompanyForm from '../../components/CompanyForm'
import Modal from '../../components/Modal'
import SidebarSlot from '../../components/SidebarSlot'
import { formatCNPJ, formatPhone } from '../../utils/format'
import './companies.css'

export default function Companies() {
  const navigate = useNavigate()
  const { companies, items, loading, deleteCompany } = useAppData()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // { company? }

  // Contagem de status por empresa
  const stats = useMemo(() => {
    const map = {}
    items.forEach(({ doc, statusKey }) => {
      if (!doc.company_id) return
      const s = (map[doc.company_id] ||= { total: 0, vencido: 0, alerta: 0, renovacao: 0, ok: 0 })
      s.total += 1
      s[statusKey] += 1
    })
    return map
  }, [items])

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return companies
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (digits && c.cnpj?.includes(digits)))
      // empresas com pendências primeiro
      .sort((a, b) => {
        const sa = stats[a.id] || {}, sb = stats[b.id] || {}
        const pa = (sa.vencido || 0) * 1000 + (sa.alerta || 0), pb = (sb.vencido || 0) * 1000 + (sb.alerta || 0)
        return pb - pa || a.name.localeCompare(b.name)
      })
  }, [companies, search, stats])

  const closeModal = useCallback(() => setModal(null), [])
  const orphan = items.filter((i) => !i.doc.company_id).length

  return (
    <>
      <SidebarSlot>
        <button type="button" className="btn btn--primary btn--block" onClick={() => setModal({})}>
          <FiPlus /> Nova empresa
        </button>
      </SidebarSlot>

      <div className="page-head">
        <div>
          <h1>Empresas</h1>
          <p className="page-head__date">{companies.length} empresa(s) cadastrada(s)</p>
        </div>
        <label className="search">
          <FiSearch aria-hidden="true" />
          <input type="search" placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {orphan > 0 && (
        <p className="note">
          {orphan} documento(s) ainda não estão ligados a uma empresa. Abra o documento em <strong>Editar</strong> e escolha a empresa.
        </p>
      )}

      {loading ? (
        <div className="company-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="company-card skeleton" />)}</div>
      ) : list.length === 0 ? (
        <div className="empty">
          <FiInbox aria-hidden="true" />
          <strong>{companies.length ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}</strong>
          <span>Cadastre pelo CNPJ e os dados são preenchidos automaticamente.</span>
          <div className="empty__actions">
            <button type="button" className="btn btn--primary" onClick={() => setModal({})}><FiPlus /> Nova empresa</button>
          </div>
        </div>
      ) : (
        <div className="company-grid">
          {list.map((c) => {
            const s = stats[c.id] || { total: 0, vencido: 0, alerta: 0, renovacao: 0, ok: 0 }
            const tone = s.vencido ? 'vencido' : s.alerta ? 'alerta' : s.renovacao ? 'renovacao' : 'ok'
            return (
              <article key={c.id} className={`company-card is-${tone}`}>
                <header className="company-card__head">
                  <span className="company-card__icon"><FiBriefcase /></span>
                  <div className="company-card__title">
                    <h3 title={c.name}>{c.name}</h3>
                    <span>{c.cnpj ? formatCNPJ(c.cnpj) : 'CNPJ não informado'}</span>
                  </div>
                </header>

                <ul className="company-card__contact">
                  <li><FiUser aria-hidden="true" />{c.contact_name || <em>Sem responsável</em>}</li>
                  <li><FiPhone aria-hidden="true" />{c.phone ? formatPhone(c.phone) : <em>Sem telefone</em>}</li>
                  <li><FiMail aria-hidden="true" />{c.email || <em>Sem e-mail</em>}</li>
                </ul>

                <div className="company-card__stats">
                  <span className="mini mini--total"><strong>{s.total}</strong> doc.</span>
                  {s.vencido > 0 && <span className="mini mini--vencido"><strong>{s.vencido}</strong> vencido(s)</span>}
                  {s.alerta > 0 && <span className="mini mini--alerta"><strong>{s.alerta}</strong> em alerta</span>}
                  {s.renovacao > 0 && <span className="mini mini--renovacao"><strong>{s.renovacao}</strong> em renovação</span>}
                  {s.total > 0 && !s.vencido && !s.alerta && !s.renovacao && <span className="mini mini--ok">Tudo em dia</span>}
                </div>

                <footer className="doc-card__footer">
                  <button type="button" className="icon-btn icon-btn--primary" onClick={() => navigate(`/dashboard?empresa=${c.id}`)}>
                    <span>Ver documentos</span><FiArrowRight />
                  </button>
                  <div className="doc-card__tools">
                    <button type="button" className="icon-btn icon-btn--primary" onClick={() => setModal({ company: c })}
                      title="Editar empresa" aria-label={`Editar ${c.name}`}><FiEdit2 /></button>
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => deleteCompany(c)}
                      title="Excluir empresa" aria-label={`Excluir ${c.name}`}><FiTrash2 /></button>
                  </div>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <button type="button" className="fab" onClick={() => setModal({})} aria-label="Nova empresa"><FiPlus /></button>

      <Modal open={!!modal} onClose={closeModal}
        title={modal?.company ? 'Editar empresa' : 'Nova empresa'}
        subtitle="Digite o CNPJ e clique em Buscar para preencher os dados da Receita Federal.">
        {modal && <CompanyForm key={modal.company?.id ?? 'nova'} initial={modal.company || null} onDone={closeModal} onCancel={closeModal} />}
      </Modal>
    </>
  )
}
