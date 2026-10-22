import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      setError('Não foi possível entrar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Faça login para gerenciar os vencimentos."
      footer={<>Ainda não tem conta?<Link to="/register">Criar conta</Link></>}
    >
      <form className="form" onSubmit={handleLogin}>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" className="input" type="email" placeholder="seu@email.com" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input id="password" className="input" type="password" placeholder="Sua senha" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="auth__msg auth__msg--error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar no sistema'}
        </button>
      </form>
    </AuthLayout>
  )
}
