/**
 * electron-builder configuration for SmartChain Desktop.
 *
 * The user-facing `electron.config.ts` re-exports this CommonJS file so the
 * configuration has a single source of truth (electron-builder itself only
 * supports JS/JSON/JSON5/YAML/TOML for its config).
 */

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'rw.smartchain.desktop',
  productName: 'SmartChain',
  copyright: 'Copyright © SmartChain',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: ['dist/**/*', 'package.json'],
  extraResources: [
    {
      from: '../frontend/dist',
      to: 'frontend-dist',
      filter: ['**/*'],
    },
  ],
  asar: true,
  protocols: [
    {
      name: 'SmartChain OAuth',
      schemes: ['smartchain'],
    },
  ],
  publish: [
    {
      provider: 'github',
      owner: 'smartchain',
      repo: 'smartchain-desktop',
      releaseType: 'release',
    },
  ],
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'assets/icon.png',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'SmartChain',
  },
  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    category: 'public.app-category.business',
    icon: 'assets/icon.png',
  },
  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb', arch: ['x64'] },
    ],
    category: 'Office',
    icon: 'assets/icon.png',
  },
}

module.exports = config
