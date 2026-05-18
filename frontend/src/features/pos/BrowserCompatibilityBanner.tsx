import { useTranslation } from 'react-i18next'
import { supports } from '../../utils/webApis'

/**
 * Shown on POS when optional hardware APIs are missing (Safari, Firefox, non-Chrome).
 */
export function BrowserCompatibilityBanner() {
  const { t } = useTranslation()
  const isFullySupported = supports.barcodeDetector && supports.wakeLock && supports.bluetooth

  if (isFullySupported) {
    return null
  }

  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
    >
      <span className="mr-1" aria-hidden>
        ⚠️
      </span>
      {t('pos.webApisBanner')}{' '}
      <a
        className="font-medium text-[var(--color-brand-800)] underline"
        href="https://www.google.com/chrome/"
        target="_blank"
        rel="noreferrer"
      >
        {t('pos.webApisBannerChrome')}
      </a>
    </div>
  )
}
