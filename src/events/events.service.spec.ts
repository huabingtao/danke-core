import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EventsService', () => {
  const prisma = {
    gameEvent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new EventsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('orders events by start date', async () => {
    prisma.gameEvent.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(prisma.gameEvent.findMany).toHaveBeenCalledWith({
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
    });
  });

  it('creates an event with parsed dates and normalized optional rewards', async () => {
    prisma.gameEvent.create.mockResolvedValue({ id: 'event-1' });
    await service.create({
      name: '  新活动  ',
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-08T00:00:00.000Z',
      rewards: '  奖励  ',
    });
    expect(prisma.gameEvent.create).toHaveBeenCalledWith({
      data: {
        name: '新活动',
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-11-08T00:00:00.000Z'),
        rewards: '奖励',
      },
    });
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      service.create({
        name: '无效活动',
        startDate: '2026-11-08T00:00:00.000Z',
        endDate: '2026-11-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not update or delete a missing event', async () => {
    prisma.gameEvent.findUnique.mockResolvedValue(null);
    await expect(
      service.update('missing', { name: '新名字' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.gameEvent.update).not.toHaveBeenCalled();
    expect(prisma.gameEvent.delete).not.toHaveBeenCalled();
  });
});
