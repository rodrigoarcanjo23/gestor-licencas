import { FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../utils/useTheme'

export default function ThemeToggle({ withLabel = false, className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Modo claro' : 'Modo escuro'

  return (
    <button
      type="button"
      className={`theme-toggle ${withLabel ? 'theme-toggle--label' : ''} ${className}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {dark ? <FiSun /> : <FiMoon />}
      {withLabel && <span>{label}</span>}
    </button>
  )
}
