'use client'

import React, { useEffect, useState } from 'react'

interface ToastMessage {
  message: string
  type: 'success' | 'warning' | 'error'
  id: string
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handleShowMessage = (event: CustomEvent) => {
      const { message, type = 'success' } = event.detail
      const id = crypto.randomUUID()
      
      const newToast: ToastMessage = { message, type, id }
      setToasts(prev => [...prev, newToast])

      // 3秒后自动移除
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }, 3000)
    }

    window.addEventListener('showMessage', handleShowMessage as EventListener)

    return () => {
      window.removeEventListener('showMessage', handleShowMessage as EventListener)
    }
  }, [])

  return (
    <>
      {children}
      
      {/* Toast 容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-md shadow-lg transform transition-all duration-300 ${
              toast.type === 'warning' ? 'bg-yellow-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-green-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  )
}