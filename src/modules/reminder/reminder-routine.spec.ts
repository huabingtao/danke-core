import { ReminderService } from './reminder.service';
import { PrismaService } from '../../prisma/prisma.service';

const weekly = {
  id: 'weekly',
  name: '远征对战',
  category: 'GUILD',
  ruleType: 'ROUTINE',
  routineType: 'WEEKLY',
  weeklyDay: 0,
  enabled: true,
  routineTemplate: '{name}剩{days}天',
  digestTemplate: '不应提前提醒',
  digestNote: '备注',
};
function serviceFor(rules = [weekly]) {
  const findMany = jest
    .fn()
    .mockImplementation(async ({ where }) =>
      rules.filter((rule) => !where.enabled || rule.enabled),
    );
  const service = new ReminderService({
    reminderRule: {
      findMany,
      findUnique: jest.fn().mockResolvedValue(rules[0]),
    },
  } as unknown as PrismaService);
  return { service, findMany };
}
afterEach(() => jest.useRealTimers());

describe('routine reminders only trigger on their scheduled day', () => {
  it.each([0, 12, 23])(
    'Sunday at %s:59 agrees across list, detail and digest',
    async (hour) => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 10, 1, hour, 59));
      const { service } = serviceFor();
      const digest = await service.getDailyDigest();
      expect(digest.items).toHaveLength(1);
      expect(digest.items[0]).toMatchObject({
        status: 'ROUTINE_TRIGGER',
        isTriggerDay: true,
        daysRemaining: 1,
        statusText: '远征对战剩1天',
        fullText: '远征对战剩1天（备注）',
      });
      expect(await service.findOne('weekly')).toMatchObject({
        computedStatus: 'ROUTINE_TRIGGER',
        daysRemaining: 1,
      });
      expect((await service.findAll())[0]).toMatchObject({
        computedStatus: 'ROUTINE_TRIGGER',
        daysRemaining: 1,
      });
    },
  );
  it.each(['2026-10-31', '2026-11-02'])(
    'omits weekly rule on %s from all digest fields',
    async (date) => {
      const { service } = serviceFor();
      const digest = await service.getDailyDigest(date);
      expect(digest.items).toEqual([]);
      expect(digest.totalActiveItems).toBe(0);
      expect(digest.summaryText).toBe('');
    },
  );
  it('retains non-trigger rules in the management list with the next-day distance', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 2, 12));
    const { service } = serviceFor();
    expect((await service.findAll())[0]).toMatchObject({
      id: 'weekly',
      daysRemaining: 6,
    });
  });
  it.each(['2026-10-31', '2026-11-01', '2026-11-02'])(
    'triggers a daily rule on %s with expanded placeholders',
    async (date) => {
      const { service } = serviceFor([{ ...weekly, routineType: 'DAILY' }]);
      expect((await service.getDailyDigest(date)).items[0]).toMatchObject({
        routineType: 'DAILY',
        daysRemaining: 1,
        isTriggerDay: true,
        status: 'ROUTINE_TRIGGER',
        statusText: '远征对战剩1天',
        digestNote: '备注',
      });
    },
  );
  it('queries enabled rules and omits disabled ones', async () => {
    const { service, findMany } = serviceFor([{ ...weekly, enabled: false }]);
    expect((await service.getDailyDigest('2026-11-01')).items).toEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ enabled: true }),
      }),
    );
  });
});
