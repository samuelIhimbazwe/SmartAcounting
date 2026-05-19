import {validateTendersForTotal} from '../src/utils/tenderValidation';

describe('validateTendersForTotal', () => {
  const total = 10000;

  it('returns underpaid when sum < total', () => {
    const result = validateTendersForTotal(
      [{tenderType: 'CASH', amount: 5000}],
      total,
    );
    expect(result).toEqual({ok: false, error: 'underpaid'});
  });

  it('returns ok when sum >= total', () => {
    const result = validateTendersForTotal(
      [
        {tenderType: 'CASH', amount: 7000},
        {tenderType: 'MOMO', amount: 3000},
      ],
      total,
    );
    expect(result).toEqual({ok: true});
  });
});
