import { createContext, useContext } from 'react'

interface ToastContextType {
  showToast: (message: string) => void
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}
