import { ReminderService } from './reminder.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Reminder cycle boundaries', () => {
  const escape = {
    id: 'escape', name: '逃离行动', category: 'START_END', ruleType: 'CYCLE',
    startDate: new Date('2026-08-12'), durationDays: 28, cycleDays: 29,
    hasRedeemDay: true, enabled: true,
  };
  function serviceFor(rule = escape) {
    return new ReminderService({ reminderRule: {
      findMany: jest.fn().mockResolvedValue([rule]),
      findUnique: jest.fn().mockResolvedValue(rule),
    }} as unknown as PrismaService);
  }
  afterEach(() => jest.useRealTimers());

  it.each([
    ['2026-08-12', 'ACTIVE', 29, 28],
    ['2026-09-30', 'ACTIVE', 9, 8],
    ['2026-10-07', 'ACTIVE', 2, 1],
    ['2026-10-08', 'REDEEM', 1, 0],
    ['2026-10-09', 'ACTIVE', 29, 28],
  ])('%s agrees across list, detail and digest', async (date, status, total, playable) => {
    jest.useFakeTimers().setSystemTime(new Date(`${date}T12:00:00`));
    const service = serviceFor();
    const digest = await service.getDailyDigest(date);
    expect(digest.items).toHaveLength(1);
    expect(digest.items[0]).toMatchObject({status, daysRemaining: total,
      playableDaysRemaining: playable, isRedeemDay: status === 'REDEEM'});
    expect(await service.findOne('escape')).toMatchObject({computedStatus: status,
      daysRemaining: total, playableDaysRemaining: playable});
    expect((await service.findAll())[0]).toMatchObject({computedStatus: status,
      daysRemaining: total, playableDaysRemaining: playable});
    if (status === 'REDEEM') expect(digest.items[0].statusText).toContain('不可游玩');
    else expect(digest.items[0].statusText).toContain(`还剩 ${total} 天`);
  });

  it('does not emit a cycle before its first start date', async () => {
    const service = serviceFor();
    expect((await service.getDailyDigest('2026-08-11')).items).toEqual([]);
  });

  it('keeps non-redemption countdowns unchanged', async () => {
    const service = serviceFor({...escape, durationDays: 7, cycleDays: 7, hasRedeemDay: false});
    expect((await service.getDailyDigest('2026-08-18')).items[0]).toMatchObject({
      status: 'ACTIVE', daysRemaining: 1, playableDaysRemaining: 1,
    });
    expect((await service.getDailyDigest('2026-08-19')).items[0].daysRemaining).toBe(7);
  });

  it('keeps idle days outside the event countdown', async () => {
    const service = serviceFor({...escape, durationDays: 2, cycleDays: 5});
    expect((await service.getDailyDigest('2026-08-12')).items[0].daysRemaining).toBe(3);
    expect((await service.getDailyDigest('2026-08-14')).items[0].status).toBe('REDEEM');
    expect((await service.getDailyDigest('2026-08-15')).items).toEqual([]);
  });

  it('retains custom templates with the total remaining days', async () => {
    const service = serviceFor({...escape, digestTemplate: '{name}剩{days}天',
      redeemTemplate: '{name}兑换日，剩{days}天'} as typeof escape);
    expect((await service.getDailyDigest('2026-09-30')).items[0].statusText).toBe('逃离行动剩9天');
    expect((await service.getDailyDigest('2026-10-08')).items[0].statusText).toBe('逃离行动兑换日，剩1天');
  });
});
