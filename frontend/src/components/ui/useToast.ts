import { useToastStore, type ToastVariant } from './toastStore'

function push(variant: ToastVariant, message: string) {
  useToastStore.getState().push(variant, message)
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  warning: (message: string) => push('warning', message),
  info: (message: string) => push('info', message),
}

export function useToast() {
  const items = useToastStore((s) => s.items)
  const dismiss = useToastStore((s) => s.dismiss)
  return { items, dismiss, toast }
}
