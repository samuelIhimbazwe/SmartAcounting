export type PriceListRef = {
  id: string;
  scope?: string;
  locationId?: string;
};

export function pickBranchPriceListId(
  lists: PriceListRef[],
  locationId?: string | null,
): string | null {
  if (!locationId) {
    return null;
  }
  const row = lists.find(
    l =>
      l.locationId === locationId &&
      (l.scope === 'LOCATION' || l.scope === undefined),
  );
  return row?.id ?? null;
}

export function pickGlobalPriceListId(lists: PriceListRef[]): string | null {
  const row = lists.find(l => l.scope === 'GLOBAL' && !l.locationId);
  return row?.id ?? null;
}
