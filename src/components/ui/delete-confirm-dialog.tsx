'use client'

import React from 'react'
import { AlertDialog } from './alert-dialog'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '删除确认',
  description = '确定要删除这个节点吗？',
}) => {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={onClose}
      title={title}
      description={description}
      onConfirm={onConfirm}
      variant="destructive"
    />
  )
}
