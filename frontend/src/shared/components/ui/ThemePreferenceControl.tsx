import clsx from 'clsx'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useThemeStore, type ThemePreference } from '../../stores/themeStore'

const OPTIONS: { value: ThemePreference; icon: typeof Sun }[] = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
]

interface ThemePreferenceControlProps {
  className?: string
  /** When false, show icon-only buttons (narrow layouts). */
  showLabels?: boolean
}

export function ThemePreferenceControl({ className, showLabels = true }: ThemePreferenceControlProps) {
  const { t } = useTranslation()
  const themePreference = useThemeStore((state) => state.preference)
  const setThemePreference = useThemeStore((state) => state.setPreference)

  return (
    <div
      className={clsx('user-menu__segmented', className)}
      role="group"
      aria-label={t('topbar.themeLabel') ?? 'Theme'}
    >
      {OPTIONS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          data-active={themePreference === value}
          aria-pressed={themePreference === value}
          title={
            value === 'system'
              ? (t('topbar.themeLabelSystemShort') ?? 'Auto')
              : value === 'light'
                ? (t('topbar.themeLabelLightShort') ?? 'Light')
                : (t('topbar.themeLabelDarkShort') ?? 'Dark')
          }
          onClick={() => setThemePreference(value)}
        >
          <Icon size={13} strokeWidth={2} />
          {showLabels && (
            <span>
              {value === 'system' && (t('topbar.themeLabelSystemShort') ?? 'Auto')}
              {value === 'light' && (t('topbar.themeLabelLightShort') ?? 'Light')}
              {value === 'dark' && (t('topbar.themeLabelDarkShort') ?? 'Dark')}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
