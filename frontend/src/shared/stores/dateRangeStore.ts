import { create } from 'zustand'
import type { DateRange } from '../types/dashboard'

/** Dashboard period selector + legacy copilot presets */
export type DatePreset =
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'MTD'
  | 'YTD'
  | 'LAST_30'

interface DateRangeState {
  dateRange: DateRange
  preset: DatePreset
  setDateRange: (dateRange: DateRange) => void
  setPreset: (preset: DatePreset) => void
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeForPreset(preset: DatePreset): DateRange {
  const to = new Date()
  let from = new Date()

  switch (preset) {
    case 'TODAY':
      from = new Date(to.getFullYear(), to.getMonth(), to.getDate())
      break
    case 'THIS_WEEK': {
      const day = to.getDay()
      const diff = day === 0 ? 6 : day - 1
      from = new Date(to)
      from.setDate(to.getDate() - diff)
      from.setHours(0, 0, 0, 0)
      break
    }
    case 'THIS_MONTH':
    case 'MTD':
      from = new Date(to.getFullYear(), to.getMonth(), 1)
      break
    case 'LAST_MONTH': {
      from = new Date(to.getFullYear(), to.getMonth() - 1, 1)
      const end = new Date(to.getFullYear(), to.getMonth(), 0)
      return { from: toIsoDate(from), to: toIsoDate(end) }
    }
    case 'YTD':
      from = new Date(to.getFullYear(), 0, 1)
      break
    case 'LAST_30':
    default:
      from = new Date(to)
      from.setDate(to.getDate() - 30)
      break
  }

  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export const useDateRangeStore = create<DateRangeState>((set) => ({
  dateRange: rangeForPreset('THIS_MONTH'),
  preset: 'THIS_MONTH',
  setDateRange: (dateRange) => set({ dateRange }),
  setPreset: (preset) =>
    set({
      preset,
      dateRange: rangeForPreset(preset),
    }),
}))
