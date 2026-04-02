'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface NotificationContextValue {
  toast: (message: Omit<ToastMessage, 'id'>) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const TOAST_DURATION = 3000
const EXIT_DURATION = 300

function Toast({
  message,
  onRemove,
}: {
  message: ToastMessage
  onRemove: (id: string) => void
}) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onRemove(message.id), EXIT_DURATION)
    }, TOAST_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message.id, onRemove])

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm shadow-md transition-all',
        'bg-white text-neutral-900 border border-neutral-200/80',
        exiting
          ? 'translate-x-[120%] opacity-0'
          : 'translate-x-0 opacity-100 animate-in slide-in-from-right-full duration-200',
      )}
      style={{ transitionDuration: `${EXIT_DURATION}ms` }}
    >
      <div
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          message.variant === 'success' && 'bg-emerald-500',
          message.variant === 'error' && 'bg-red-500',
          message.variant === 'info' && 'bg-neutral-400',
        )}
      />
      <span className="font-medium leading-snug">{message.title}</span>
    </div>
  )
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const removeMessage = useCallback((id: string) => {
    setMessages((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}`

    setMessages((current) => [{ ...message, id }, ...current])
  }, [])

  const contextValue = useMemo(() => ({ toast }), [toast])

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {messages.map((message) => (
          <Toast key={message.id} message={message} onRemove={removeMessage} />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useToast() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useToast must be used within NotificationProvider')
  }
  return context.toast
}
