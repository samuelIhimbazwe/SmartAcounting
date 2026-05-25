import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isDesktopBundle = process.env.VITE_DESKTOP_BUNDLE === 'true'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Manual chunk groups (Vite 8 / Rolldown: object `manualChunks` is removed — same groups via function).
 *
 *   vendor-react:  react, react-dom, react-router-dom
 *   vendor-ui:     lucide-react, @tanstack/react-query, zustand (+ i18n/forms; no @radix-ui in repo)
 *   vendor-charts: recharts
 *   fiscal:        src/services/fiscal/* + crypto-js
 *   vendor-xlsx, vendor-sentry, vendor-auth, vendor-axios — split further when a vendor exceeded 500 kB
 */
const VENDOR_REACT = new Set(['react', 'react-dom', 'react-router-dom'])
/** No @radix-ui in this app — UI/data layer packages instead of the template radix entries. */
const VENDOR_UI = new Set([
  'lucide-react',
  '@tanstack/react-query',
  'zustand',
  'react-hook-form',
  'react-i18next',
  'i18next',
])
const VENDOR_CHARTS = new Set(['recharts'])
const VENDOR_XLSX = new Set(['xlsx'])
const VENDOR_SENTRY = new Set(['@sentry/react'])
const VENDOR_AUTH = new Set(['@azure/msal-browser', '@azure/msal-react', '@react-oauth/google'])
const VENDOR_AXIOS = new Set(['axios'])
const VENDOR_CRYPTO = new Set(['crypto-js'])

function normalizeId(id: string): string {
  return id.replace(/\\/g, '/')
}

function nodeModulePackage(id: string): string | null {
  const normalized = normalizeId(id)
  const marker = '/node_modules/'
  const idx = normalized.lastIndexOf(marker)
  if (idx === -1) {
    return null
  }
  const rest = normalized.slice(idx + marker.length)
  if (rest.startsWith('@')) {
    const parts = rest.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null
  }
  return rest.split('/')[0] ?? null
}

function manualChunkForId(id: string): string | undefined {
  const normalized = normalizeId(id)

  if (normalized.includes('/src/services/fiscal/')) {
    return 'fiscal'
  }

  const pkg = nodeModulePackage(id)
  if (!pkg) {
    return undefined
  }

  if (VENDOR_REACT.has(pkg)) {
    return 'vendor-react'
  }
  if (VENDOR_CHARTS.has(pkg)) {
    return 'vendor-charts'
  }
  if (VENDOR_UI.has(pkg)) {
    return 'vendor-ui'
  }
  if (VENDOR_XLSX.has(pkg)) {
    return 'vendor-xlsx'
  }
  if (VENDOR_SENTRY.has(pkg)) {
    return 'vendor-sentry'
  }
  if (VENDOR_AUTH.has(pkg)) {
    return 'vendor-auth'
  }
  if (VENDOR_AXIOS.has(pkg)) {
    return 'vendor-axios'
  }
  if (VENDOR_CRYPTO.has(pkg)) {
    return 'fiscal'
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  base: isDesktopBundle ? './' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return manualChunkForId(id)
        },
      },
    },
  },
})
