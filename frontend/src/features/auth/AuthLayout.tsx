import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Sparkles, Globe2 } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  /** Optional wide layout (e.g. signup plan grid) widens the form column. */
  wide?: boolean
}

export function AuthLayout({ children, wide = false }: AuthLayoutProps) {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <main className="auth-shell">
      <section className="auth-shell__hero" aria-hidden="true">
        <div className="auth-shell__hero-grid" />
        <div className="auth-shell__hero-glow" />

        <div className="auth-shell__hero-inner">
          <div className="auth-brand">
            <div className="auth-brand__mark">SA</div>
            <div>
              <div className="auth-brand__name">{t('auth.appName')}</div>
              <div className="auth-brand__tagline">{t('auth.brandTagline')}</div>
            </div>
          </div>

          <div className="auth-hero__copy">
            <span className="auth-hero__eyebrow">{t('auth.heroEyebrow')}</span>
            <h2 className="auth-hero__title">{t('auth.heroTitle')}</h2>
            <p className="auth-hero__lead">{t('auth.heroSubtitle')}</p>

            <ul className="auth-hero__features">
              <li>
                <span className="auth-hero__feature-icon">
                  <Sparkles size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>{t('auth.heroFeature1Title')}</strong>
                  <p>{t('auth.heroFeature1Body')}</p>
                </div>
              </li>
              <li>
                <span className="auth-hero__feature-icon">
                  <ShieldCheck size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>{t('auth.heroFeature2Title')}</strong>
                  <p>{t('auth.heroFeature2Body')}</p>
                </div>
              </li>
              <li>
                <span className="auth-hero__feature-icon">
                  <Globe2 size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>{t('auth.heroFeature3Title')}</strong>
                  <p>{t('auth.heroFeature3Body')}</p>
                </div>
              </li>
            </ul>
          </div>

          <p className="auth-hero__footer">
            {t('auth.heroFooter')}
            <span className="auth-hero__copyright"> &copy; {year} SmartAccounting.</span>
          </p>
        </div>
      </section>

      <section className={`auth-shell__panel${wide ? ' auth-shell__panel--wide' : ''}`}>
        <div className="auth-shell__panel-inner">
          {children}
        </div>
      </section>
    </main>
  )
}
