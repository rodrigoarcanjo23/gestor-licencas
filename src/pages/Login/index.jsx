import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

// --- ESTILOS (LIGHT MODE - DOC EM DIA) ---
const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f6f9', // Fundo claro
  padding: '20px',
  fontFamily: 'Arial, sans-serif'
}

const cardStyle = {
  background: '#ffffff',
  padding: '40px 30px',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)', // Sombra suave
  width: '100%',
  maxWidth: '400px',
  textAlign: 'center',
  border: '1px solid #eee'
}

const inputStyle = {
  width: '100%',
  padding: '14px',
  marginBottom: '15px',
  borderRadius: '8px',
  border: '1px solid #ddd',
  background: '#fff',
  color: '#333',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box'
}

const buttonStyle = {
  width: '100%',
  padding: '14px',
  background: '#007bff', // Azul DOC em dia
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold',
  marginTop: '10px',
  transition: '0.2s'
}

const linkStyle = {
  color: '#007bff',
  textDecoration: 'none',
  fontSize: '14px',
  marginTop: '20px',
  display: 'inline-block'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    
    try {
      // CORREÇÃO AQUI: Removemos "data" pois não estava sendo usada
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      navigate('/dashboard')
      
    } catch (error) {
      // O console.error ajuda a ver o erro real no navegador se precisar
      console.error(error)
      alert("Erro ao entrar: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        {/* LOGO DA EMPRESA (pasta public) */}
        <img 
            src="/logo.png" 
            alt="DOC em dia" 
            style={{ width: '120px', marginBottom: '20px', objectFit: 'contain' }} 
        />

        <h2 style={{color: '#333', marginBottom: '10px', marginTop: 0}}>Bem-vindo</h2>
        <p style={{color: '#666', fontSize: '14px', marginBottom: '30px'}}>
            Faça login para gerenciar os vencimentos.
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button disabled={loading} style={buttonStyle}>
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{marginTop: '20px'}}>
             <span style={{color: '#888', fontSize: '14px'}}>Ainda não tem conta? </span>
             <Link to="/register" style={linkStyle}>Criar conta</Link>
        </div>

      </div>
    </div>
  )
}