import { useEffect, useState } from 'react'
import { Bell, ChevronDown, Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { listLocations } from '../../api/locations'
import { useAlertStore } from '../../stores/alertStore'
import { useBranchStore } from '../../stores/branchStore'
import type { Role } from '../../types/roles'
import { GlobalSearch } from './GlobalSearch'
import { Badge } from '../../../components/ui/Badge'

interface TopBarProps {
  role: Role
  onOpenAlerts: () => void
  onOpenMenu: () => void
}

export function TopBar({ role, onOpenAlerts, onOpenMenu }: TopBarProps) {
  const { t } = useTranslation()
  const unreadCount = useAlertStore((s) => s.unreadCount)
  const markAllRead = useAlertStore((s) => s.markAllRead)
  const branchId = useBranchStore((s) => s.branchId)
  const branchName = useBranchStore((s) => s.branchName)
  const setBranch = useBranchStore((s) => s.setBranch)
  const [branchOpen, setBranchOpen] = useState(false)

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
    staleTime: 60_000,
  })

  const locations = locationsQuery.data ?? []

  useEffect(() => {
    if (!branchId && locations.length > 0) {
      const first = locations[0]!
      setBranch(first.id, first.name)
    }
  }, [branchId, locations, setBranch])

  const currentBranch = branchName ?? locations.find((l) => l.id === branchId)?.name ?? t('nav.selectBranch')

  return (
    <header className="shell-topbar">
      <button
        type="button"
        className="shell-topbar__menu"
        onClick={onOpenMenu}
        aria-label={t('topbar.openMenu')}
      >
        <Menu size={20} />
      </button>

      <div className="shell-topbar__actions">
        <div className="shell-topbar__search">
          <GlobalSearch role={role} />
        </div>

        <button
          type="button"
          className="shell-topbar__icon-btn"
          onClick={() => {
            markAllRead()
            onOpenAlerts()
          }}
          aria-label={t('topbar.openAlerts')}
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <Badge variant="error" size="sm" className="shell-topbar__badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          ) : null}
        </button>

        <div className="shell-topbar__branch">
          <button
            type="button"
            className="shell-topbar__branch-btn"
            onClick={() => setBranchOpen((v) => !v)}
            aria-expanded={branchOpen}
          >
            <span className="shell-topbar__branch-label">{currentBranch}</span>
            <ChevronDown size={16} aria-hidden />
          </button>
          {branchOpen ? (
            <ul className="shell-topbar__branch-menu" role="listbox">
              {locations.length === 0 ? (
                <li className="shell-topbar__branch-item shell-topbar__branch-item--muted">
                  {locationsQuery.isLoading ? t('common.loading') : t('nav.noBranches')}
                </li>
              ) : (
                locations.map((loc) => (
                  <li key={loc.id}>
                    <button
                      type="button"
                      className={`shell-topbar__branch-item${loc.id === branchId ? ' shell-topbar__branch-item--active' : ''}`}
                      onClick={() => {
                        setBranch(loc.id, loc.name)
                        setBranchOpen(false)
                      }}
                    >
                      {loc.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </header>
  )
}
