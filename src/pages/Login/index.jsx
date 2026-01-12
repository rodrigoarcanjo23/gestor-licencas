import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

// Adicionei um estilo global para o corpo da página ficar escuro, combinando com o form
const pageStyle = {
  height: '100vh',
  width: '100vw', // <--- ADICIONE ISSO (Ocupa 100% da largura da janela)
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#1a1a1a',
  color: '#fff',
  fontFamily: 'Arial, sans-serif',
  position: 'fixed', // <--- ADICIONE ISSO (Garante que fique fixo sobre tudo)
  top: 0,
  left: 0
}

const formContainerStyle = {
  background: '#2a2a2a', // Um cinza um pouco mais claro para o card
  padding: '40px',
  borderRadius: '12px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
  width: '100%',
  maxWidth: '400px', // Largura máxima do cartão de login
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  textAlign: 'center'
}

const inputStyle = {
  padding: '15px',
  borderRadius: '8px',
  border: '1px solid #444',
  background: '#333',
  color: '#fff',
  fontSize: '16px',
  outline: 'none'
}

const buttonPrimaryStyle = {
  padding: '15px',
  borderRadius: '8px',
  border: 'none',
  background: '#007bff', // Azul padrão, pode mudar para a cor da sua marca
  color: '#fff',
  fontSize: '18px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'background 0.2s'
}

const buttonSecondaryStyle = {
  padding: '10px',
  background: 'transparent',
  border: 'none',
  color: '#aaa',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: '14px'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Erro ao logar: " + error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleSignUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert("Erro ao cadastrar: " + error.message)
    } else {
      alert("Usuário criado com sucesso! Fazendo login...")
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={handleLogin} style={formContainerStyle}>
        <h2 style={{ margin: '0 0 10px 0' }}>Acesso ao Sistema</h2>
        <p style={{ color: '#aaa', margin: 0 }}>Gerenciador de Documentos</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <button type="submit" disabled={loading} style={buttonPrimaryStyle}>
          {loading ? 'Carregando...' : 'Entrar'}
        </button>

        <button 
          type="button" 
          onClick={handleSignUp} 
          disabled={loading}
          style={buttonSecondaryStyle}
        >
          Não tem conta? Cadastrar
        </button>
      </form>
    </div>
  )
}