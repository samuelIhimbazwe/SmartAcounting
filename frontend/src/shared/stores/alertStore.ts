import { create } from 'zustand'
import type { AlertEvent } from '../types/dashboard'

interface AlertState {
  alerts: AlertEvent[]
  unreadCount: number
  addAlert: (alert: AlertEvent) => void
  setAlerts: (alerts: AlertEvent[]) => void
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
  setAlerts: (alerts) => set({ alerts: alerts.slice(0, 100), unreadCount: alerts.length }),
  markAllRead: () => set({ unreadCount: 0 }),
}))
