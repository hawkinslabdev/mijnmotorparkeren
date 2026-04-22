import React, { createContext, useContext, useCallback, useState } from 'react'
import * as RadixToast from '@radix-ui/react-toast'

interface ToastContextType {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

interface ToastItem {
  id: number
  message: string
  open: boolean
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, open: true }])
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="up" duration={2500}>
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            open={toast.open}
            onOpenChange={(open) => {
              if (!open) dismissToast(toast.id)
            }}
            className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-xl"
          >
            <RadixToast.Description>{toast.message}</RadixToast.Description>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-max max-w-xs" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
