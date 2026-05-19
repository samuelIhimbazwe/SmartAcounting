import {database} from '../db';
import {PriceList} from '../db/models/PriceList';
import {
  pickBranchPriceListId,
  pickGlobalPriceListId,
  type PriceListRef,
} from './priceListPick';

export async function loadPriceListContext(locationId?: string | null): Promise<{
  branchPriceListId: string | null;
  globalPriceListId: string | null;
}> {
  const lists = await database.get<PriceList>('price_lists').query().fetch();
  const refs: PriceListRef[] = lists
    .filter(l => !l.deletedAt)
    .map(l => ({
      id: l.id,
      scope: l.scope,
      locationId: l.locationId,
    }));
  return {
    branchPriceListId: pickBranchPriceListId(refs, locationId),
    globalPriceListId: pickGlobalPriceListId(refs),
  };
}
