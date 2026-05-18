/**
 * PWA update prompt — enabled when vite-plugin-pwa is configured.
 * No-op in default builds so production `tsc` stays green without virtual modules.
 */
export function PwaUpdatePrompt() {
  return null
}
