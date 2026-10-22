import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Coloca conteúdo da página dentro da barra lateral (área "sidebar-slot")
export default function SidebarSlot({ children }) {
  const [target, setTarget] = useState(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- o alvo só existe depois da montagem
  useEffect(() => { setTarget(document.getElementById('sidebar-slot')) }, [])
  return target ? createPortal(children, target) : null
}
