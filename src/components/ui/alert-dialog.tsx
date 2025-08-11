'use client'

import React, { useEffect } from 'react'
import { Button } from './button'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  variant?: 'destructive' | 'default'
  allowClickOutside?: boolean
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  variant = 'default',
  allowClickOutside = false,
}: AlertDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        onOpenChange(false)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange, onConfirm])

  if (!open) return null

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleBackdropClick = () => {
    if (allowClickOutside) {
      onOpenChange(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="alert-dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        data-testid="alert-dialog-backdrop"
      />

      {/* Dialog */}
      <div
        className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4"
        data-testid="alert-dialog-content"
      >
        <h3
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
          data-testid="alert-dialog-title"
        >
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6" data-testid="alert-dialog-description">
          {description}
        </p>

        <div className="flex justify-end gap-3" data-testid="alert-dialog-actions">
          <Button variant="outline" onClick={handleCancel} data-testid="alert-dialog-cancel">
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            data-testid="alert-dialog-confirm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
