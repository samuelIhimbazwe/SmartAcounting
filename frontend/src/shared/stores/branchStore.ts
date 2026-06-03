import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const STORAGE_KEY = 'smartaccounting-branch'

interface BranchState {
  branchId: string | null
  branchName: string | null
  setBranch: (id: string, name: string) => void
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branchId: null,
      branchName: null,
      setBranch: (branchId, branchName) => set({ branchId, branchName }),
    }),
    { name: STORAGE_KEY },
  ),
)
