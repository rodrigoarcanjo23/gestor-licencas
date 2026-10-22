import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setSuccess(true)
    } catch (error) {
      setError(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Preencha os dados abaixo para começar."
      footer={<>Já tem uma conta?<Link to="/">Fazer login</Link></>}
    >
      {success ? (
        <p className="auth__msg auth__msg--success" role="status">
          Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login.
        </p>
      ) : (
        <form className="form" onSubmit={handleRegister}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" placeholder="Seu melhor e-mail" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" className="input" type="password" placeholder="Crie uma senha segura"
              autoComplete="new-password" minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="auth__msg auth__msg--error" role="alert">{error}</p>}
          <button className="btn btn--success btn--block" disabled={loading}>
            {loading ? 'Criando...' : 'Cadastrar'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
