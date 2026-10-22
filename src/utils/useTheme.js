import { useEffect, useState } from 'react'

const KEY = 'docemdia-theme'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* sem acesso ao storage */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Aplica o tema o quanto antes (evita "piscar" claro ao abrir no modo escuro)
export function applyInitialTheme() {
  document.documentElement.dataset.theme = getInitialTheme()
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || getInitialTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(KEY, theme) } catch { /* ignora */ }
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggleTheme }
}
