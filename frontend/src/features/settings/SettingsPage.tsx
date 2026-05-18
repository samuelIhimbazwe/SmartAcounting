import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, Link2, Monitor, Printer } from 'lucide-react'
import { fetchOAuth2Providers, requestOAuth2Link, type OAuth2Provider } from '../../shared/api/auth'
import { fetchCopilotProviderStatus, type CopilotProviderStatus } from '../../shared/api/copilot'
import { API_BASE_URL } from '../../shared/api/config'
import { rolePathMap } from '../../shared/types/roles'
import { useAuthStore } from '../../shared/stores/authStore'
import { desktop, isDesktop } from '../../utils/platform'
import { OAuth2CodeLoginButtons } from '../auth/OAuth2CodeLoginButtons'

export function SettingsPage() {
  const { t } = useTranslation()
  const { accessToken, tenantId, role } = useAuthStore()
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [printers, setPrinters] = useState<string[]>([])
  const [providers, setProviders] = useState<OAuth2Provider[]>([])
  const [linkMessage, setLinkMessage] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<CopilotProviderStatus | null>(null)

  const dashboardPath = role ? `/dashboard/${rolePathMap[role]}` : '/dashboard'

  useEffect(() => {
    if (!isDesktop() || !desktop) {
      return
    }
    void desktop.app.version().then(setAppVersion)
    void desktop.app.platform().then(setPlatform)
    void desktop.printer.list().then(setPrinters).catch(() => setPrinters([]))
  }, [])

  useEffect(() => {
    fetchOAuth2Providers()
      .then(setProviders)
      .catch(() => setProviders([]))
    fetchCopilotProviderStatus()
      .then(setAiStatus)
      .catch(() => setAiStatus(null))
  }, [])

  async function onLinkProvider(provider: OAuth2Provider) {
    if (!accessToken) {
      return
    }
    setLinkMessage(null)
    setLinkError(null)
    try {
      const authorizePath = await requestOAuth2Link(provider.provider)
      if (isDesktop() && desktop?.auth?.startOAuth) {
        await desktop.auth.startOAuth(API_BASE_URL, authorizePath)
      } else {
        window.open(`${API_BASE_URL}${authorizePath}`, '_blank', 'noopener,noreferrer')
      }
      setLinkMessage(t('settings.oauthLinkBrowserHint'))
    } catch (caught) {
      setLinkError(caught instanceof Error ? caught.message : t('settings.oauthLinkFailed'))
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <Link to={dashboardPath} className="settings-page__back">
          <ArrowLeft size={16} />
          {t('settings.backToDashboard')}
        </Link>
        <h1>{t('settings.title')}</h1>
        <p className="settings-page__subtitle">{t('settings.subtitle')}</p>
      </header>

      {aiStatus && (
        <section className="settings-card">
          <h2>AI copilot</h2>
          <p className="settings-muted">
            Mode: <strong>{aiStatus.mode}</strong> · Model: {aiStatus.model}
          </p>
          <p className={aiStatus.configured ? 'settings-info' : 'settings-error'}>{aiStatus.hint}</p>
        </section>
      )}

      {isDesktop() && (
        <section className="settings-card">
          <h2>
            <Monitor size={18} />
            {t('settings.desktopSection')}
          </h2>
          <dl className="settings-dl">
            <div>
              <dt>{t('settings.appVersion')}</dt>
              <dd>{appVersion ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('settings.platform')}</dt>
              <dd>{platform ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('settings.tenantId')}</dt>
              <dd className="settings-mono">{tenantId}</dd>
            </div>
          </dl>
        </section>
      )}

      {isDesktop() && (
        <section className="settings-card">
          <h2>
            <Printer size={18} />
            {t('settings.printersSection')}
          </h2>
          {printers.length === 0 ? (
            <p className="settings-muted">{t('settings.noPrinters')}</p>
          ) : (
            <ul className="settings-list">
              {printers.map((port) => (
                <li key={port}>{port}</li>
              ))}
            </ul>
          )}
          <p className="settings-muted">{t('settings.printerHint')}</p>
        </section>
      )}

      {accessToken && providers.length > 0 && (
        <section className="settings-card">
          <h2>
            <Link2 size={18} />
            {t('settings.oauthSection')}
          </h2>
          <p className="settings-muted">{t('settings.oauthSectionHint')}</p>
          {linkMessage && <p className="settings-info">{linkMessage}</p>}
          {linkError && <p className="settings-error">{linkError}</p>}
          <div className="settings-oauth-actions">
            {providers.map((provider) => (
              <button
                key={provider.provider}
                type="button"
                className="auth-btn oauth2-button"
                onClick={() => void onLinkProvider(provider)}
              >
                {t('settings.linkProvider', {
                  name: provider.displayName.replace(/^Continue with /i, ''),
                })}
              </button>
            ))}
          </div>
        </section>
      )}

      {!accessToken && providers.length > 0 && (
        <section className="settings-card">
          <h2>{t('settings.oauthSignInSection')}</h2>
          <OAuth2CodeLoginButtons providers={providers} />
        </section>
      )}

      <style>{`
        .settings-page { max-width: 640px; margin: 0 auto; padding: 24px 20px 48px; }
        .settings-page__header { margin-bottom: 24px; }
        .settings-page__back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 12px; color: var(--color-primary); text-decoration: none; }
        .settings-page h1 { margin: 0 0 8px; font-size: 1.5rem; }
        .settings-page__subtitle { margin: 0; color: var(--color-text-secondary); font-size: 14px; }
        .settings-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
        .settings-card h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 1rem; }
        .settings-dl { display: grid; gap: 10px; margin: 0; }
        .settings-dl dt { font-size: 12px; color: var(--color-text-muted); }
        .settings-dl dd { margin: 0; font-size: 14px; }
        .settings-mono { font-family: ui-monospace, monospace; font-size: 12px; word-break: break-all; }
        .settings-muted { font-size: 13px; color: var(--color-text-secondary); margin: 0 0 8px; }
        .settings-info { font-size: 13px; color: var(--color-primary); margin: 8px 0; }
        .settings-error { font-size: 13px; color: #b91c1c; margin: 8px 0; }
        .settings-list { margin: 0; padding-left: 1.2rem; font-size: 14px; }
        .settings-oauth-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
      `}</style>
    </div>
  )
}
