export type TenderType =
  | 'CASH'
  | 'MOMO'
  | 'AIRTEL_MONEY'
  | 'CARD'
  | 'ON_ACCOUNT';

export interface TenderLine {
  tenderType: TenderType;
  amount: number;
  reference?: string | null;
}

export function cartTotal(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

export function sumTenderLines(lines: TenderLine[]): number {
  return lines.reduce((sum, line) => sum + (line.amount || 0), 0);
}

export type TenderValidationResult =
  | {ok: true}
  | {ok: false; error: 'empty' | 'underpaid'};

export function validateTendersForTotal(
  lines: TenderLine[],
  total: number,
): TenderValidationResult {
  if (lines.length === 0) {
    return {ok: false, error: 'empty'};
  }
  const paid = sumTenderLines(lines);
  if (paid + 0.001 < total) {
    return {ok: false, error: 'underpaid'};
  }
  return {ok: true};
}
