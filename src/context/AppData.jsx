/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { supabase } from '../supabaseClient'
import { DEFAULT_ALERT_DAYS, getDays, getStatusKey, toISODate } from '../utils/status'
import { uploadAttachment, removeAttachment } from '../utils/files'
import { useToasts, ToastStack } from '../components/Toasts'
import Modal from '../components/Modal'

const AppDataContext = createContext(null)
export const useAppData = () => useContext(AppDataContext)

const DEFAULT_SETTINGS = {
  office_name: '',
  report_name: '',
  report_email: '',
  report_whatsapp: '',
  alert_days: DEFAULT_ALERT_DAYS,
  email_enabled: true,
  notify_mode: 'etapas',
  notify_steps: [60, 30, 15, 7, 0],
  category_validity: {},
}

export function AppDataProvider({ children }) {
  const { toasts, push } = useToasts()
  const [user, setUser] = useState(null)
  const [docs, setDocs] = useState([])
  const [companies, setCompanies] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [hasSettings, setHasSettings] = useState(true)
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState(null)

  const alertDays = settings.alert_days || DEFAULT_ALERT_DAYS

  // --- Confirmação reutilizável --------------------------------------
  const confirm = useCallback((opts) => setConfirmState(opts), [])
  const closeConfirm = useCallback(() => setConfirmState(null), [])

  // --- Carregamento ----------------------------------------------------
  const loadAll = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoading(false); return }
    setUser(u)

    const [d, c, s] = await Promise.all([
      supabase.from('documents').select('*').eq('user_id', u.id).order('expiry_date', { ascending: true }),
      supabase.from('companies').select('*').eq('user_id', u.id).order('name', { ascending: true }),
      supabase.from('user_settings').select('*').eq('user_id', u.id).maybeSingle(),
    ])

    if (d.error) { console.error(d.error); push('Não foi possível carregar os documentos.', 'error') }
    else setDocs(d.data || [])

    if (c.error) console.error('Empresas:', c.error) // tabela ainda não criada? (rode a migração SQL)
    else setCompanies(c.data || [])

    if (s.error) console.error('Configurações:', s.error)
    if (s.data) { setSettings({ ...DEFAULT_SETTINGS, ...s.data }); setHasSettings(true) }
    else { setSettings({ ...DEFAULT_SETTINGS, report_email: u.email || '' }); setHasSettings(false) }

    setLoading(false)
  }, [push])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial dos dados
  useEffect(() => { loadAll() }, [loadAll])

  // --- Dados derivados -------------------------------------------------
  const companiesById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies])

  const items = useMemo(() => docs.map((doc) => {
    const days = getDays(doc)
    return { doc, days, statusKey: getStatusKey(days, alertDays, doc.renewal_status), company: companiesById[doc.company_id] || null }
  }), [docs, alertDays, companiesById])

  // --- Notificação local (somente Android) -----------------------------
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || loading) return
    const critical = items.filter((i) => i.statusKey === 'vencido' || i.statusKey === 'alerta')
    ;(async () => {
      const perm = await LocalNotifications.requestPermissions()
      if (perm.display !== 'granted' || critical.length === 0) return
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] })
      await LocalNotifications.schedule({
        notifications: [{
          title: '⚠️ Atenção DOC em dia!',
          body: `Você tem ${critical.length} documento(s) vencidos ou vencendo em até ${alertDays} dias.`,
          id: 1, schedule: { at: new Date(Date.now() + 1000) },
        }],
      })
    })().catch(console.error)
  }, [items, loading, alertDays])

  // --- Empresas --------------------------------------------------------
  const ensureCompany = useCallback(async (name) => {
    const clean = name.trim()
    const existing = companies.find((c) => c.name.toLowerCase() === clean.toLowerCase())
    if (existing) return existing
    const { data, error } = await supabase.from('companies').insert([{ name: clean, user_id: user.id }]).select().single()
    if (error) throw error
    setCompanies((list) => [...list, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }, [companies, user])

  const saveCompany = useCallback(async (values, existing) => {
    try {
      if (existing) {
        const { data, error } = await supabase.from('companies').update(values).eq('id', existing.id).select().single()
        if (error) throw error
        // mantém o nome da empresa igual nos documentos
        if (values.name && values.name !== existing.name) {
          await supabase.from('documents').update({ title: values.name }).eq('company_id', existing.id)
        }
        setCompanies((list) => list.map((c) => (c.id === data.id ? data : c)))
        push('Empresa atualizada!')
      } else {
        const { error } = await supabase.from('companies').insert([{ ...values, user_id: user.id }])
        if (error) throw error
        push('Empresa cadastrada!')
      }
      await loadAll()
      return true
    } catch (error) {
      console.error(error)
      push(error.code === '23505' ? 'Já existe uma empresa com esse nome.' : 'Erro ao salvar: ' + error.message, 'error')
      return false
    }
  }, [user, push, loadAll])

  const deleteCompany = useCallback((company) => {
    const count = docs.filter((d) => d.company_id === company.id).length
    confirm({
      title: 'Excluir empresa',
      message: count
        ? `"${company.name}" tem ${count} documento(s). Eles continuam cadastrados, mas ficam sem vínculo com a empresa.`
        : `Excluir "${company.name}"?`,
      confirmLabel: 'Excluir',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('companies').delete().eq('id', company.id)
        if (error) return push('Erro: ' + error.message, 'error')
        push('Empresa excluída.')
        loadAll()
      },
    })
  }, [docs, confirm, push, loadAll])

  // --- Documentos ------------------------------------------------------
  // values: { company_id | newCompanyName, category, expiry_date, observation }
  const saveDocument = useCallback(async (values, { file, removeFile, existing } = {}) => {
    try {
      const company = values.newCompanyName
        ? await ensureCompany(values.newCompanyName)
        : companiesById[values.company_id]
      if (!company) throw new Error('Selecione a empresa.')

      const row = {
        title: company.name,
        company_id: company.id,
        category: values.category,
        expiry_date: values.expiry_date,
        observation: values.observation || '',
        updated_at: new Date().toISOString(),
      }

      let saved
      if (existing) {
        const { data, error } = await supabase.from('documents').update(row).eq('id', existing.id).select().single()
        if (error) throw error
        saved = data
      } else {
        const { data, error } = await supabase.from('documents').insert([{ ...row, user_id: user.id }]).select().single()
        if (error) throw error
        saved = data
      }

      if (file || (removeFile && saved.file_path)) {
        const old = saved.file_path
        const patch = file ? await uploadAttachment(user.id, saved.id, file) : { file_path: null, file_name: null }
        const { error } = await supabase.from('documents').update(patch).eq('id', saved.id)
        if (error) throw error
        if (old) await removeAttachment(old)
      }

      push(existing ? 'Documento atualizado!' : 'Documento salvo!')
      await loadAll()
      return true
    } catch (error) {
      console.error(error)
      push('Erro ao salvar: ' + error.message, 'error')
      return false
    }
  }, [ensureCompany, companiesById, user, push, loadAll])

  const deleteDocument = useCallback((doc) => {
    confirm({
      title: 'Excluir documento',
      message: `Tem certeza que deseja excluir "${doc.title}" (${doc.category})? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('documents').delete().eq('id', doc.id)
        if (error) return push('Erro: ' + error.message, 'error')
        await removeAttachment(doc.file_path)
        push('Documento excluído.')
        loadAll()
      },
    })
  }, [confirm, push, loadAll])

  // --- Renovação -------------------------------------------------------
  const setRenewalStage = useCallback(async (doc, stage) => {
    const history = [...(doc.renewal_history || []), { at: new Date().toISOString(), type: 'etapa', stage: stage || null }]
    const { error } = await supabase.from('documents')
      .update({ renewal_status: stage || null, renewal_history: history, updated_at: new Date().toISOString() })
      .eq('id', doc.id)
    if (error) { push('Erro: ' + error.message, 'error'); return false }
    push(stage ? 'Etapa da renovação atualizada.' : 'Renovação cancelada.')
    await loadAll()
    return true
  }, [push, loadAll])

  const completeRenewal = useCallback(async (doc, { newDate, note, file }) => {
    try {
      const history = [...(doc.renewal_history || []), {
        at: new Date().toISOString(), type: 'renovado', from: doc.expiry_date, to: newDate, note: note || '',
      }]
      const patch = { expiry_date: newDate, renewal_status: null, renewal_history: history, updated_at: new Date().toISOString() }
      if (file) Object.assign(patch, await uploadAttachment(user.id, doc.id, file))
      const { error } = await supabase.from('documents').update(patch).eq('id', doc.id)
      if (error) throw error
      if (file && doc.file_path) await removeAttachment(doc.file_path)
      push('Renovação concluída! Novo vencimento salvo.')
      await loadAll()
      return true
    } catch (error) {
      console.error(error)
      push('Erro: ' + error.message, 'error')
      return false
    }
  }, [user, push, loadAll])

  // --- Importação ------------------------------------------------------
  const importRows = useCallback(async (rows) => {
    try {
      // 1) cria as empresas que ainda não existem
      const known = new Map(companies.map((c) => [c.name.toLowerCase(), c]))
      const toCreate = []
      for (const r of rows) {
        const key = r.title.toLowerCase()
        if (!known.has(key) && !toCreate.some((c) => c.name.toLowerCase() === key)) {
          toCreate.push({ name: r.title, cnpj: r.cnpj || null, user_id: user.id })
        }
      }
      if (toCreate.length) {
        const { data, error } = await supabase.from('companies').insert(toCreate).select()
        if (error) throw error
        data.forEach((c) => known.set(c.name.toLowerCase(), c))
      }
      // 2) insere os documentos em lotes
      const docsRows = rows.map((r) => {
        const c = known.get(r.title.toLowerCase())
        return { title: c.name, company_id: c.id, category: r.category, expiry_date: r.expiry_date, observation: r.observation || '', user_id: user.id }
      })
      for (let i = 0; i < docsRows.length; i += 500) {
        const { error } = await supabase.from('documents').insert(docsRows.slice(i, i + 500))
        if (error) throw error
      }
      push(`${docsRows.length} documento(s) importado(s)!`)
      await loadAll()
      return true
    } catch (error) {
      console.error(error)
      push('Erro na importação: ' + error.message, 'error')
      return false
    }
  }, [companies, user, push, loadAll])

  // --- Configurações ---------------------------------------------------
  const saveSettings = useCallback(async (values) => {
    const row = { ...values, user_id: user.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('user_settings').upsert(row).select().single()
    if (error) { push('Erro ao salvar: ' + error.message, 'error'); return false }
    setSettings({ ...DEFAULT_SETTINGS, ...data })
    setHasSettings(true)
    push('Configurações salvas!')
    return true
  }, [user, push])

  const value = {
    user, docs, companies, companiesById, items, settings, hasSettings, alertDays, loading,
    today: toISODate(new Date()),
    push, confirm, reload: loadAll,
    saveDocument, deleteDocument, setRenewalStage, completeRenewal, importRows,
    saveCompany, deleteCompany, saveSettings,
  }

  return (
    <AppDataContext.Provider value={value}>
      {children}

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
    </AppDataContext.Provider>
  )
}
