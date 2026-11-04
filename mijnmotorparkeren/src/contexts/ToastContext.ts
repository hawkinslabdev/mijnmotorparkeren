import { createContext, useContext } from 'react'

interface ToastContextType {
  showToast: (message: string, duration?: number) => void
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}
