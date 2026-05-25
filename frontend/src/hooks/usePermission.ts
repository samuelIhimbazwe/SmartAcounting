import { useAuthStore } from '../shared/stores/authStore'

export function usePermission(code: string): boolean {
  return useAuthStore((s) => s.hasPermission(code))
}

export function useAnyPermission(codes: string[]): boolean {
  return useAuthStore((s) => codes.some((c) => s.hasPermission(c)))
}
