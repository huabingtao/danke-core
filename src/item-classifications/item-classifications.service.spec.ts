import { BadRequestException } from '@nestjs/common';
import { ItemClassificationsService } from './item-classifications.service';
import { validate } from 'class-validator';
import { MatrixPreferenceDto } from './classifications.dto';

describe('classification and private matrix preferences', () => {
  function setup() {
    const prisma = {
      itemCategory: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      resourceType: {
        findUnique: jest.fn().mockResolvedValue({ id: 'core' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      item: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'a' }]),
        update: jest.fn(),
      },
      userViewPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    return { prisma, service: new ItemClassificationsService(prisma as never) };
  }
  it('updates multi-system membership within a transaction without touching yields', async () => {
    const { prisma, service } = setup();
    expect(
      await service.bulk({
        itemIds: ['a'],
        categoryIds: ['equipment', 'pet'],
        resourceTypeId: 'core',
      }),
    ).toEqual({ updated: 1 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: {
        resourceTypeId: 'core',
        categories: {
          deleteMany: {},
          create: [{ categoryId: 'equipment' }, { categoryId: 'pet' }],
        },
      },
    });
  });
  it('rejects unknown items before any write', async () => {
    const { prisma, service } = setup();
    await expect(
      service.bulk({ itemIds: ['a', 'missing'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.item.update).not.toHaveBeenCalled();
  });
  it('rejects unknown categories and resource types', async () => {
    const { prisma, service } = setup();
    await expect(
      service.validate({ categoryIds: ['missing'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.resourceType.findUnique.mockResolvedValue(null);
    await expect(
      service.validate({ resourceTypeId: 'missing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('uses the authenticated owner and distinguishes unsaved from an empty preference', async () => {
    const { prisma, service } = setup();
    expect(await service.preference('owner')).toEqual({
      selectedItemIds: null,
    });
    prisma.item.count.mockResolvedValue(0);
    expect(await service.savePreference('owner', [])).toEqual({
      selectedItemIds: [],
    });
    expect(
      prisma.userViewPreference.upsert.mock.calls[0][0].create,
    ).toMatchObject({ userId: 'owner', selectedItemIds: '[]' });
    prisma.userViewPreference.findUnique.mockResolvedValue({
      selectedItemIds: '["a","deleted"]',
    });
    expect(await service.preference('owner')).toEqual({
      selectedItemIds: ['a'],
    });
  });
  it('rejects duplicate IDs in the preference DTO', async () => {
    const dto = Object.assign(new MatrixPreferenceDto(), {
      selectedItemIds: ['a', 'a'],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});

describe('resource view preference keys', () => {
  it('keeps the legacy all key and isolates agent/keys configuration with view membership checks', async () => {
    const prisma = {
      item: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'a' }]),
      },
      userViewPreference: {
        upsert: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ selectedItemIds: '["a","removed"]' }),
      },
    };
    const service = new ItemClassificationsService(prisma as never);
    await service.savePreference('owner', ['a']);
    expect(
      prisma.userViewPreference.upsert.mock.calls[0][0].create.viewKey,
    ).toBe('yield-matrix');
    await service.savePreference('owner', ['a'], 'agent');
    expect(
      prisma.userViewPreference.upsert.mock.calls[1][0].create.viewKey,
    ).toBe('yield-matrix:agent');
    expect(prisma.item.count).toHaveBeenLastCalledWith({
      where: {
        id: { in: ['a'] },
        categories: { some: { categoryId: { in: ['agent'] } } },
      },
    });
    expect(await service.preference('owner', 'keys')).toEqual({
      selectedItemIds: ['a'],
    });
    expect(prisma.item.findMany).toHaveBeenLastCalledWith({
      where: {
        id: { in: ['a', 'removed'] },
        categories: { some: { categoryId: { in: ['key'] } } },
      },
      select: { id: true },
    });
    await expect(
      service.savePreference('owner', [], 'unknown'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userViewPreference.upsert).toHaveBeenCalledTimes(2);
  });
});
