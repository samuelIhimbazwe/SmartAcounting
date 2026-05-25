#!/usr/bin/env node
/**
 * Compare translation keys between EN, FR, and RW in frontend i18n resources.
 * Fails with exit code 1 when any key is missing in any locale.
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')

execSync('npx --yes tsx scripts/i18n-compare.ts', {
  cwd: frontendRoot,
  stdio: 'inherit',
})
