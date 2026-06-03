import { Link } from 'react-router-dom'
import { Moon, Settings, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../types/roles'

function initialsFrom(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return text.slice(0, 2).toUpperCase()
}

export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  const role = useAuthStore((s) => s.role) as Role | null
  const assignedRoles = useAuthStore((s) => s.assignedRoles)
  const userId = useAuthStore((s) => s.userId)
  const { theme, toggleTheme } = useTheme()

  const displayName =
    assignedRoles.find((r) => r.owner)?.name ??
    assignedRoles[0]?.name ??
    (role ?? 'User')
  const initials = initialsFrom(displayName || userId || 'U')

  return (
    <footer className="shell-sidebar__footer">
      <div className="shell-sidebar__user">
        <span className="shell-sidebar__avatar" aria-hidden>
          {initials}
        </span>
        {!collapsed ? (
          <div className="shell-sidebar__user-text">
            <span className="shell-sidebar__user-name">{displayName}</span>
            <span className="shell-sidebar__user-role">{role ?? t('nav.dashboard')}</span>
          </div>
        ) : null}
      </div>
      <div className={`shell-sidebar__footer-actions${collapsed ? ' shell-sidebar__footer-actions--collapsed' : ''}`}>
        <Link to="/settings" className="shell-sidebar__icon-btn" aria-label={t('nav.settingsPage')}>
          <Settings size={18} />
        </Link>
        <button
          type="button"
          className="shell-sidebar__icon-btn"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </footer>
  )
}
