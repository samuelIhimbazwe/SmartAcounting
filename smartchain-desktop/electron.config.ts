/**
 * Type-only mirror of `electron-builder.config.cjs`.
 *
 * electron-builder cannot consume a `.ts` config directly, so the actual
 * runtime config lives in the CommonJS sibling. This file exists for IDE /
 * `tsc` validation and as the documented entry point referenced by the
 * project README.
 */
import type { Configuration } from 'electron-builder'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config: Configuration = require('./electron-builder.config.cjs') as Configuration

export default config
