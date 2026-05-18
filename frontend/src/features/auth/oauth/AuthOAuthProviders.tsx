import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication, type Configuration } from '@azure/msal-browser'
import { GoogleOAuthProvider } from '@react-oauth/google'
import type { ReactNode } from 'react'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const microsoftClientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? ''

let msalInstance: PublicClientApplication | null = null

function getMsalInstance(): PublicClientApplication | null {
  if (!microsoftClientId) {
    return null
  }
  if (!msalInstance) {
    const config: Configuration = {
      auth: {
        clientId: microsoftClientId,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      },
    }
    msalInstance = new PublicClientApplication(config)
  }
  return msalInstance
}

export function AuthOAuthProviders({ children }: { children: ReactNode }) {
  const msal = getMsalInstance()
  let content = children
  if (msal) {
    content = <MsalProvider instance={msal}>{content}</MsalProvider>
  }
  if (googleClientId) {
    content = <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>
  }
  return content
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(googleClientId)
}

export function isMicrosoftOAuthConfigured(): boolean {
  return Boolean(microsoftClientId)
}
