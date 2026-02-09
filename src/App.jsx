import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Verifica se já existe sessão salva ao abrir o App
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Se já estiver logado, joga direto para o painel
      if (session) navigate('/dashboard')
    })

    // 2. Fica ouvindo: se fizer Login ou Logout, ele muda a tela
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/dashboard')
      } else {
        navigate('/') // Se deslogou, volta pro Login
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}