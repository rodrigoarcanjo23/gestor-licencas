/* eslint-disable react-refresh/only-export-components */
import { useCallback, useState } from 'react'
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi'

const ICONS = { success: FiCheckCircle, error: FiAlertCircle, info: FiInfo }

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])
  return { toasts, push }
}

export function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map(({ id, message, type }) => {
        const Icon = ICONS[type] || FiInfo
        return (
          <div key={id} className={`toast toast--${type}`}>
            <Icon aria-hidden="true" />
            <span>{message}</span>
          </div>
        )
      })}
    </div>
  )
}
