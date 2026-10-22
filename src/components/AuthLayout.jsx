import { FiBell, FiFileText, FiShare2 } from 'react-icons/fi'
import logo from '../assets/logo.png'
import ThemeToggle from './ThemeToggle'
import './auth.css'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__brand-inner">
          <img src={logo} alt="DOC em dia" className="auth__brand-logo" />
          <h1>Nunca mais perca um vencimento.</h1>
          <p>Alvarás, licenças, laudos e certificados das suas empresas organizados em um só lugar.</p>
          <ul>
            <li><span><FiBell /></span>Alertas de documentos vencidos e a vencer em 30 dias</li>
            <li><span><FiFileText /></span>Relatórios em Excel com um clique</li>
            <li><span><FiShare2 /></span>Envio rápido por e-mail e WhatsApp</li>
          </ul>
        </div>
      </aside>

      <main className="auth__main">
        <ThemeToggle className="auth__theme" />
        <div className="auth__card">
          <img src={logo} alt="DOC em dia" className="auth__card-logo" />
          <h2>{title}</h2>
          <p className="auth__subtitle">{subtitle}</p>
          {children}
          <div className="auth__footer">{footer}</div>
        </div>
      </main>
    </div>
  )
}
