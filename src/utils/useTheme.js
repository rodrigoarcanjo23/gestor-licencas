import { useSyncExternalStore } from 'react'

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

// O tema fica no atributo data-theme do <html>; todos os botões leem dali
function subscribe(callback) {
  const obs = new MutationObserver(callback)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => obs.disconnect()
}
const getSnapshot = () => document.documentElement.dataset.theme || 'light'

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot)
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(KEY, next) } catch { /* ignora */ }
  }
  return { theme, toggleTheme }
}
