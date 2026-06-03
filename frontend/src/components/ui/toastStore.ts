import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  message: string
}

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 4000

interface ToastState {
  items: ToastItem[]
  push: (variant: ToastVariant, message: string) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (variant, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set((state) => ({
      items: [...state.items, { id, variant, message }].slice(-MAX_TOASTS),
    }))
    window.setTimeout(() => {
      if (get().items.some((t) => t.id === id)) {
        get().dismiss(id)
      }
    }, AUTO_DISMISS_MS)
  },
  dismiss: (id) => {
    set((state) => ({ items: state.items.filter((t) => t.id !== id) }))
  },
}))
