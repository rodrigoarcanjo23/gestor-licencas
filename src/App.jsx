import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Settings from './pages/Settings'
import AppLayout from './components/AppLayout'
import { AppDataProvider } from './context/AppData'

const PUBLIC_PATHS = ['/', '/register']

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(undefined) // undefined = verificando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // Só muda de tela ao entrar ou sair (não a cada renovação do token)
      if (event === 'SIGNED_OUT') navigate('/')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  // Já logado tentando ver login/cadastro → vai para o painel
  useEffect(() => {
    if (session && PUBLIC_PATHS.includes(location.pathname)) navigate('/dashboard', { replace: true })
  }, [session, location.pathname, navigate])

  if (session === undefined) return null

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={session
          ? <AppDataProvider key={session.user.id}><AppLayout /></AppDataProvider>
          : <Navigate to="/" replace />}
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empresas" element={<Companies />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
    </Routes>
  )
}
