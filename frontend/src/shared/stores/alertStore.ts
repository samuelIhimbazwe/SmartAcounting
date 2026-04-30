import { create } from 'zustand'
import type { AlertEvent } from '../types/dashboard'

interface AlertState {
  alerts: AlertEvent[]
  unreadCount: number
  addAlert: (alert: AlertEvent) => void
  markAllRead: () => void
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 100),
      unreadCount: state.unreadCount + 1,
    })),
  markAllRead: () => set({ unreadCount: 0 }),
}))
