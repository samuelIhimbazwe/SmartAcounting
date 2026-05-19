import {
  pickBranchPriceListId,
  pickGlobalPriceListId,
} from '../src/pricing/priceListPick';

describe('location scoping — price lists', () => {
  const lists = [
    {id: 'global-1', scope: 'GLOBAL'},
    {id: 'branch-a', scope: 'LOCATION', locationId: 'loc-a'},
    {id: 'branch-b', scope: 'LOCATION', locationId: 'loc-b'},
  ];

  it('picks branch list for active location only', () => {
    expect(pickBranchPriceListId(lists, 'loc-a')).toBe('branch-a');
    expect(pickBranchPriceListId(lists, 'loc-b')).toBe('branch-b');
    expect(pickBranchPriceListId(lists, 'loc-x')).toBeNull();
  });

  it('picks global list when no branch match', () => {
    expect(pickGlobalPriceListId(lists)).toBe('global-1');
  });
});
