import { Test, TestingModule } from '@nestjs/testing';
import { ReminderService } from './reminder.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ReminderService Comprehensive Tests', () => {
  let service: ReminderService;
  let prisma: PrismaService;

  const mockRoutineRule = {
    id: 'rule-1',
    name: '公会远征提醒',
    category: 'START_END',
    ruleType: 'ROUTINE',
    routineType: 'WEEKLY',
    weeklyDay: 0,
    dailyTime: '20:00',
    enabled: true,
    content: '公会远征快结束了！',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDailyRule = {
    id: 'rule-daily',
    name: '每日签到',
    category: 'START_END',
    ruleType: 'ROUTINE',
    routineType: 'DAILY',
    dailyTime: '09:00',
    enabled: true,
    content: '记得签到',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCycleRule = {
    id: 'rule-cycle-1',
    name: '区域行动',
    category: 'START_END',
    ruleType: 'CYCLE',
    startDate: new Date('2026-08-23'),
    durationDays: 7,
    cycleDays: 7,
    remindTime: '20:00',
    remindDays: 'FIRST_DAY,LAST_2_DAYS,LAST_1_DAYS',
    hasRedeemDay: false,
    enabled: true,
    content: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventRule = {
    id: 'rule-event-1',
    name: '周年庆彩虹矿山',
    category: 'START_END',
    ruleType: 'EVENT',
    startDate: new Date('2026-08-25'),
    durationDays: 5,
    hasRedeemDay: true,
    remindTime: '20:00',
    remindDays: 'LAST_1_DAYS',
    enabled: true,
    content: '彩虹矿山限时活动提醒！',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        {
          provide: PrismaService,
          useValue: {
            reminderRule: {
              findMany: jest.fn().mockImplementation(({ where }) => {
                const all = [mockRoutineRule, mockDailyRule, mockCycleRule, mockEventRule];
                if (where && where.category) {
                  return Promise.resolve(all.filter((r) => r.category === where.category));
                }
                return Promise.resolve(all);
              }),
              findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
                if (id === 'rule-1') return Promise.resolve(mockRoutineRule);
                if (id === 'rule-daily') return Promise.resolve(mockDailyRule);
                if (id === 'rule-cycle-1') return Promise.resolve(mockCycleRule);
                if (id === 'rule-event-1') return Promise.resolve(mockEventRule);
                return Promise.resolve(null);
              }),
              create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rule-new', ...data })),
              update: jest.fn().mockImplementation(({ where: { id }, data }) => Promise.resolve({ ...mockRoutineRule, ...data, id })),
              delete: jest.fn().mockResolvedValue(mockRoutineRule),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ReminderService>(ReminderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Schedule Formatters', () => {
    it('should format weekly routine schedule correctly', async () => {
      const rule = await service.findOne('rule-1');
      expect(rule.humanSchedule).toBe('每周周日打卡提醒');
    });

    it('should format daily routine schedule correctly', async () => {
      const rule = await service.findOne('rule-daily');
      expect(rule.humanSchedule).toBe('每日打卡提醒');
    });

    it('should format cycle rule schedule correctly', async () => {
      const rule = await service.findOne('rule-cycle-1');
      expect(rule.humanSchedule).toContain('持续 7 天');
      expect(rule.humanSchedule).toContain('每 7 天循环');
    });
  });

  describe('CRUD Operations', () => {
    it('should findAll rules without filter', async () => {
      const list = await service.findAll();
      expect(list.length).toBe(4);
    });

    it('should findAll rules with category filter', async () => {
      const list = await service.findAll('START_END');
      expect(list.length).toBe(4);
    });

    it('should create new rule', async () => {
      const dto = {
        name: '新活动',
        ruleType: 'CYCLE' as const,
        startDate: '2026-09-01',
        durationDays: 14,
        cycleDays: 14,
        content: '新活动备注',
      };
      const res = await service.create(dto);
      expect(res.name).toBe('新活动');
    });

    it('should update existing rule', async () => {
      const dto = { name: '更新活动名称' };
      const res = await service.update('rule-1', dto);
      expect(res.name).toBe('更新活动名称');
    });

    it('should toggle enabled state of rule', async () => {
      const res = await service.toggleEnabled('rule-1');
      expect(res.enabled).toBe(false);
    });

    it('should delete existing rule', async () => {
      const res = await service.remove('rule-1');
      expect(res.id).toBe('rule-1');
      expect(prisma.reminderRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    });

    it('should throw NotFoundException on findOne for non-existent rule', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should support sorting by daysRemaining ascending and descending', async () => {
      const listAsc = await service.findAll(undefined, 'daysRemaining', 'asc');
      expect(listAsc.length).toBe(4);
      for (let i = 0; i < listAsc.length - 1; i++) {
        expect(listAsc[i].daysRemaining).toBeLessThanOrEqual(listAsc[i + 1].daysRemaining);
      }

      const listDesc = await service.findAll(undefined, 'daysRemaining', 'desc');
      expect(listDesc.length).toBe(4);
      for (let i = 0; i < listDesc.length - 1; i++) {
        expect(listDesc[i].daysRemaining).toBeGreaterThanOrEqual(listDesc[i + 1].daysRemaining);
      }
    });

    it('should support sorting by name', async () => {
      const listByName = await service.findAll(undefined, 'name', 'asc');
      expect(listByName.length).toBe(4);
      expect(listByName[0].name.localeCompare(listByName[1].name)).toBeLessThanOrEqual(0);
    });
  });
});
