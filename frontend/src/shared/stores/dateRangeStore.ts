import { create } from 'zustand'
import type { DateRange } from '../types/dashboard'

type DatePreset = 'MTD' | 'YTD' | 'LAST_30'

interface DateRangeState {
  dateRange: DateRange
  preset: DatePreset
  setDateRange: (dateRange: DateRange) => void
  setPreset: (preset: DatePreset) => void
}

function getDefaultRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 30)

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export const useDateRangeStore = create<DateRangeState>((set) => ({
  dateRange: getDefaultRange(),
  preset: 'LAST_30',
  setDateRange: (dateRange) => set({ dateRange }),
  setPreset: (preset) => {
    const to = new Date()
    let from = new Date()
    if (preset === 'MTD') {
      from = new Date(to.getFullYear(), to.getMonth(), 1)
    }
    if (preset === 'YTD') {
      from = new Date(to.getFullYear(), 0, 1)
    }
    if (preset === 'LAST_30') {
      from = new Date(to)
      from.setDate(to.getDate() - 30)
    }
    set({
      preset,
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      },
    })
  },
}))
