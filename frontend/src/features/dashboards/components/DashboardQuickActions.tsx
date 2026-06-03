import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileText,
  Package,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '../../../components/ui'
import { useRecommendedActions } from '../../actions/useRecommendedActions'
import type { RecommendedAction } from '../../../shared/types/dashboard'
import type { Role } from '../../../shared/types/roles'

const ICONS = [ClipboardCheck, Package, Receipt, FileText, TrendingUp, AlertTriangle]

function actionIcon(index: number) {
  const Icon = ICONS[index % ICONS.length]
  return <Icon size={18} strokeWidth={1.75} aria-hidden />
}

function priorityClass(priority: RecommendedAction['priority']): string {
  if (priority === 'CRITICAL' || priority === 'HIGH') {
    return 'dash-priority__item--urgent'
  }
  return ''
}

export function DashboardQuickActions({ role }: { role: Role }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useRecommendedActions(role)
  const items = (data ?? []).slice(0, 5)

  const onOpen = (action: RecommendedAction) => {
    if (action.targetRoute) {
      navigate(action.targetRoute)
      return
    }
    navigate('/actions')
  }

  return (
    <aside className="dash-priority">
      <h3 className="dash-priority__title">{t('dashboard.prioritiesTitle')}</h3>
      {isLoading ? (
        <ul className="dash-priority__list">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="dash-priority__item">
              <Skeleton variant="circle" width={32} height={32} />
              <Skeleton variant="text" height={14} />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="dash-priority__empty">{t('dashboard.prioritiesEmpty')}</p>
      ) : (
        <ul className="dash-priority__list">
          {items.map((action, index) => (
            <li key={action.id}>
              <button
                type="button"
                className={`dash-priority__item ${priorityClass(action.priority)}`}
                onClick={() => onOpen(action)}
              >
                <span className="dash-priority__icon">{actionIcon(index)}</span>
                <span className="dash-priority__text">
                  <span className="dash-priority__label">{action.title}</span>
                  {action.description ? (
                    <span className="dash-priority__desc">{action.description}</span>
                  ) : null}
                </span>
                <ArrowRight size={16} className="dash-priority__arrow" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
