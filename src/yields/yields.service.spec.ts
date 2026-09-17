import { Test, TestingModule } from '@nestjs/testing';
import { YieldsService } from './yields.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('YieldsService', () => {
  let service: YieldsService;
  let prisma: PrismaService;

  const mockItem = { id: 'item-1', name: '钻石', type: 'CURRENCY' };
  const mockSource = { id: 'source-1', name: '每日签到', type: 'DAILY' };
  const mockEvent = { id: 'event-1', name: '周年庆活动' };
  const mockYield = {
    id: 'yield-1',
    itemId: 'item-1',
    sourceId: 'source-1',
    eventId: null,
    amount: 100,
    month: 8,
    year: 2026,
    notes: '签到获取',
    item: mockItem,
    source: mockSource,
    event: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YieldsService,
        {
          provide: PrismaService,
          useValue: {
            item: {
              findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
                if (id === 'item-1') return Promise.resolve(mockItem);
                return Promise.resolve(null);
              }),
            },
            source: {
              findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
                if (id === 'source-1') return Promise.resolve(mockSource);
                return Promise.resolve(null);
              }),
            },
            gameEvent: {
              findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
                if (id === 'event-1') return Promise.resolve(mockEvent);
                return Promise.resolve(null);
              }),
            },
            monthlyYield: {
              upsert: jest.fn().mockResolvedValue(mockYield),
              findMany: jest.fn().mockResolvedValue([mockYield]),
              findUnique: jest.fn().mockResolvedValue(mockYield),
              delete: jest.fn().mockResolvedValue(mockYield),
            },
          },
        },
      ],
    }).compile();

    service = module.get<YieldsService>(YieldsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdate', () => {
    it('should create or update yield when item, source and event are valid', async () => {
      const dto = {
        itemId: 'item-1',
        sourceId: 'source-1',
        amount: 100,
        month: 8,
        year: 2026,
      };
      const res = await service.createOrUpdate(dto);
      expect(res).toEqual(mockYield);
      expect(prisma.monthlyYield.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if item not found', async () => {
      const dto = {
        itemId: 'item-999',
        sourceId: 'source-1',
        amount: 100,
        month: 8,
        year: 2026,
      };
      await expect(service.createOrUpdate(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if source not found', async () => {
      const dto = {
        itemId: 'item-1',
        sourceId: 'source-999',
        amount: 100,
        month: 8,
        year: 2026,
      };
      await expect(service.createOrUpdate(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if eventId provided but event not found', async () => {
      const dto = {
        itemId: 'item-1',
        sourceId: 'source-1',
        eventId: 'event-999',
        amount: 100,
        month: 8,
        year: 2026,
      };
      await expect(service.createOrUpdate(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return yields filtered by query', async () => {
      const res = await service.findAll({ year: '2026', month: '8', itemId: 'item-1', sourceId: 'source-1' });
      expect(res).toEqual([mockYield]);
      expect(prisma.monthlyYield.findMany).toHaveBeenCalled();
    });
  });

  describe('getMonthlyReport', () => {
    it('should aggregate yields into columns and rows matrix', async () => {
      const report = await service.getMonthlyReport(2026, 8);
      expect(report.year).toBe(2026);
      expect(report.month).toBe(8);
      expect(report.columns).toHaveLength(1);
      expect(report.columns[0].id).toBe('source-1');
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].id).toBe('item-1');
      expect(report.rows[0].total).toBe(100);
      expect(report.rows[0].yields['source-1']).toBe(100);
    });
  });
});
