import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FiGrid, FiBriefcase, FiSettings, FiLogOut } from 'react-icons/fi'
import logo from '../assets/logo.png'
import { supabase } from '../supabaseClient'
import { useAppData } from '../context/AppData'
import ThemeToggle from './ThemeToggle'
import '../pages/Dashboard/dashboard.css'

const NAV = [
  { to: '/dashboard', label: 'Painel', icon: FiGrid },
  { to: '/empresas', label: 'Empresas', icon: FiBriefcase },
  { to: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: FiSettings },
]

export default function AppLayout() {
  const { user, settings, companies } = useAppData()
  const navigate = useNavigate()
  const email = user?.email || ''
  const displayName = settings.office_name || (email ? email.split('@')[0] : 'Usuário')

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

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

        <nav className="sidebar__section" aria-label="Menu principal">
          <span className="sidebar__heading">Menu</span>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}>
              <Icon className="side-link__nav-icon" />
              {label}
              {to === '/empresas' && <span className="side-link__count">{companies.length}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Ações específicas da página (ex.: relatórios do painel) */}
        <div id="sidebar-slot" className="sidebar__slot" />

        <ThemeToggle withLabel className="sidebar__theme" />

        <div className="sidebar__user">
          <span className="avatar">{displayName[0]?.toUpperCase() || 'U'}</span>
          <div className="sidebar__user-info">
            <strong title={displayName}>{displayName}</strong>
            <span title={email}>{email}</span>
          </div>
          <button type="button" className="icon-btn" onClick={handleLogout} title="Sair" aria-label="Sair">
            <FiLogOut />
          </button>
        </div>
      </aside>

      {/* ===== CONTEÚDO ===== */}
      <main className="main">
        <header className="topbar">
          <img src={logo} alt="DOC em dia" />
          <div className="topbar__actions">
            <ThemeToggle />
            <button type="button" className="btn btn--outline-danger btn--sm" onClick={handleLogout}>
              <FiLogOut /> Sair
            </button>
          </div>
        </header>
        <Outlet />
      </main>

      {/* ===== NAVEGAÇÃO INFERIOR (celular / tablet) ===== */}
      <nav className="bottom-nav" aria-label="Menu principal">
        {NAV.map(({ to, label, short, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}>
            <Icon />
            <span>{short || label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
