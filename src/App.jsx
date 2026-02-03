import { Routes, Route } from 'react-router-dom' // <--- SEM BrowserRouter aqui!
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    /* O HashRouter já está lá no main.jsx envolvendo o <App />. 
       Aqui usamos direto as Routes. */
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App