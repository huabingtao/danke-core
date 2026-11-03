import { canonicalIds, mergedInto } from './item-identity';
describe('confirmed item aliases', () => {
  it('normalizes an archived alias and deduplicates preference IDs without changing order', () => {
    const rows = [
      { id: 'alias', stats: '{"_mergedInto":"official"}' },
      { id: 'official' },
      { id: 'other' },
    ];
    expect(canonicalIds(['other', 'alias', 'official'], rows)).toEqual([
      'other',
      'official',
    ]);
    expect(mergedInto('{"atk":12}')).toBeUndefined();
  });
  it('rejects circular aliases', () => {
    expect(() =>
      canonicalIds(
        ['a'],
        [
          { id: 'a', stats: { _mergedInto: 'b' } },
          { id: 'b', stats: { _mergedInto: 'a' } },
        ],
      ),
    ).toThrow('循环');
  });
});
