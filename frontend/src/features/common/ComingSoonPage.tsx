import { Link } from 'react-router-dom'
import { rolePathMap } from '../../shared/types/roles'
import { useAuthStore } from '../../shared/stores/authStore'

export function ComingSoonPage() {
  const role = useAuthStore((s) => s.role)
  const dashboardPath = role ? `/dashboard/${rolePathMap[role]}` : '/dashboard'

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">This feature is coming soon.</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Marketplace, plugin store, and IoT device management are not available in this release.
      </p>
      <Link
        to={dashboardPath}
        className="mt-6 inline-flex rounded-md bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
