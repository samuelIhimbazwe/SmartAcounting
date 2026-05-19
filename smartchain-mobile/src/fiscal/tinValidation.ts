/** RRA_API_TODO: confirm TIN format with official RRA documentation. */
export const RRA_TIN_REGEX = /^\d{9}$/;

export function isValidTinFormat(tin: string | null | undefined): boolean {
  if (!tin) {
    return true;
  }
  const normalized = tin.trim();
  if (!normalized) {
    return true;
  }
  return RRA_TIN_REGEX.test(normalized);
}

export function normalizeTin(tin: string): string {
  return tin.trim();
}

/**
 * RRA_API_TODO: POST to RRA TIN lookup endpoint when URL and auth are confirmed.
 */
export async function verifyTinWithRra(
  _tin: string,
): Promise<{registered: boolean; name?: string}> {
  return {registered: true};
}
