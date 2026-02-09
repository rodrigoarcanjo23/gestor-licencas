import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

// Reutilizando os estilos do Login para manter padrão
const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f6f9',
  padding: '20px',
  fontFamily: 'Arial, sans-serif'
}

const cardStyle = {
  background: '#ffffff',
  padding: '40px 30px',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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
  background: '#28a745', // Verde para diferenciar do Login
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

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      alert('Cadastro realizado! Verifique seu e-mail para confirmar.')
      navigate('/')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img 
            src="/logo.png" 
            alt="DOC em dia" 
            style={{ width: '180px', marginBottom: '25px', objectFit: 'contain' }} 
        />
        
        <h2 style={{color: '#333', marginBottom: '10px', marginTop: 0}}>Criar Conta</h2>
        <p style={{color: '#666', fontSize: '14px', marginBottom: '30px'}}>
            Preencha os dados abaixo para começar.
        </p>

        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Seu melhor e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Crie uma senha segura"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button disabled={loading} style={buttonStyle}>
            {loading ? 'Criando...' : 'Cadastrar'}
          </button>
        </form>

        <div style={{marginTop: '20px'}}>
             <span style={{color: '#888', fontSize: '14px'}}>Já tem uma conta? </span>
             <Link to="/" style={linkStyle}>Fazer Login</Link>
        </div>
      </div>
    </div>
  )
}