import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GemValuationDto } from './dto/gem-valuation.dto';
import { updateValuation } from './gem-valuation';
describe('gem valuation contract', () => {
  it('preserves reference precision and metadata including zero', () => {
    const previous = {
      prices: [{ id: 'a', label: '协同前', value: 0.12, referenceValue: 0.12 }],
      sourceUrl: 'https://sio-tools.exp0.dev/gems',
      manuallyModified: false,
    };
    expect(
      updateValuation(previous, { prices: [{ id: 'a', value: 0 }] }),
    ).toMatchObject({
      prices: [{ id: 'a', label: '协同前', value: 0, referenceValue: 0.12 }],
      sourceUrl: previous.sourceUrl,
      manuallyModified: true,
    });
  });
  it('rejects changed or removed scenarios', () => {
    expect(() =>
      updateValuation(
        { prices: [{ id: 'a' }, { id: 'b' }] },
        { prices: [{ id: 'a', value: 2 }] },
      ),
    ).toThrow('估值方案已变化');
  });
  it.each([-1, NaN, Infinity])(
    'rejects invalid unit price %s',
    async (value) => {
      const dto = plainToInstance(GemValuationDto, {
        prices: [{ id: 'default', value }],
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
  it('rejects duplicate scenarios', async () => {
    expect(
      await validate(
        plainToInstance(GemValuationDto, {
          prices: [
            { id: 'a', value: 1 },
            { id: 'a', value: 2 },
          ],
        }),
      ),
    ).not.toHaveLength(0);
  });
});
