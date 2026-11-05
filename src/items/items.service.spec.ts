import { ItemClassificationsService } from '../item-classifications/item-classifications.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemsService } from './items.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: PrismaService;

  const mockItem = {
    id: 'item-1',
    name: '钻石',
    type: 'CURRENCY',
    description: '核心货币',
    stats: '{"atk": 10}',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: ItemClassificationsService,
          useValue: { validate: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: PrismaService,
          useValue: {
            item: {
              findUnique: jest
                .fn()
                .mockImplementation(({ where: { id, name } }) => {
                  if (id === 'item-1' || name === '钻石')
                    return Promise.resolve(mockItem);
                  return Promise.resolve(null);
                }),
              findMany: jest.fn().mockResolvedValue([mockItem]),
              create: jest
                .fn()
                .mockImplementation(({ data }) =>
                  Promise.resolve({ id: 'item-new', ...data }),
                ),
              update: jest
                .fn()
                .mockImplementation(({ data }) =>
                  Promise.resolve({ ...mockItem, ...data }),
                ),
              delete: jest.fn().mockResolvedValue(mockItem),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    prisma = module.get<PrismaService>(PrismaService);
    prisma.$transaction = jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create new item when name does not conflict', async () => {
      jest.spyOn(prisma.item, 'findUnique').mockResolvedValue(null);
      const dto = {
        name: '金币',
        icon: '/icons/items/金币.png',
        type: 'CURRENCY',
        stats: { value: 100 },
      };
      const res = await service.create(dto);
      expect(res.name).toBe('金币');
      expect(res.icon).toBe('/icons/items/金币.png');
      expect(res.stats).toEqual({ value: 100 });
    });

    it('should throw ConflictException if item name already exists', async () => {
      const dto = { name: '钻石', type: 'CURRENCY' };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return list of parsed items', async () => {
      const items = await service.findAll();
      expect(items).toHaveLength(1);
      expect(items[0].stats).toEqual({ atk: 10 });
    });
  });

  describe('findOne', () => {
    it('should return single item if found', async () => {
      const item = await service.findOne('item-1');
      expect(item.id).toBe('item-1');
    });

    it('should throw NotFoundException if item not found', async () => {
      await expect(service.findOne('item-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update item attributes', async () => {
      const dto = {
        description: '新描述',
        icon: '/icons/items/新图标.png',
        stats: { atk: 20 },
      };
      const res = await service.update('item-1', dto);
      expect(res.description).toBe('新描述');
      expect(res.icon).toBe('/icons/items/新图标.png');
      expect(res.stats).toEqual({ atk: 20 });
    });

    it('should throw ConflictException if updated name conflicts with another item', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 'item-1', name: '钻石' } as any);
      jest
        .spyOn(prisma.item, 'findUnique')
        .mockResolvedValue({ id: 'item-2', name: '已存在物品' } as any);
      await expect(
        service.update('item-1', { name: '已存在物品' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('gem valuations', () => {
    it('updates decimal prices while preserving unrelated stats in a transaction', async () => {
      const item = await service.update('item-1', {
        gemValuation: { prices: [{ id: 'default', value: 0.02 }] },
      });
      expect(item.stats.atk).toBe(10);
      expect(item.gemValuation.prices[0].value).toBe(0.02);
      expect(item.gemValuation.manuallyModified).toBe(true);
      expect((prisma.$transaction as jest.Mock).mock.calls).toHaveLength(1);
    });
    it('rejects raw stats namespace spoofing and leaves writes untouched', async () => {
      await expect(
        service.update('item-1', { stats: { _gemValuation: { prices: [] } } }),
      ).rejects.toThrow('请使用 gemValuation');
      expect((prisma.item.update as jest.Mock).mock.calls).toHaveLength(0);
    });
  });

  describe('non-destructive alias consolidation', () => {
    it('hides archived rows but resolves the old ID to the official item', async () => {
      const official = {
        ...mockItem,
        stats: JSON.stringify({
          _itemAliases: [{ id: 'old', name: '旧名称' }],
        }),
      };
      const alias = {
        ...mockItem,
        id: 'old',
        name: '旧名称',
        stats: JSON.stringify({ _mergedInto: 'item-1' }),
      };
      jest
        .spyOn(prisma.item, 'findMany')
        .mockResolvedValue([alias, official] as any);
      jest
        .spyOn(prisma.item, 'findUnique')
        .mockImplementation(
          ({ where }: any) =>
            Promise.resolve(where.id === 'old' ? alias : official) as any,
        );
      const items = await service.findAll();
      expect(items).toHaveLength(1);
      expect(items[0].aliases).toContain('旧名称');
      expect((await service.findOne('old')).id).toBe('item-1');
      await expect(service.remove('old')).rejects.toThrow('已合并');
    });
  });

  describe('remove', () => {
    it('should delete and return item', async () => {
      const res = await service.remove('item-1');
      expect(res.id).toBe('item-1');
      expect((prisma.item.delete as jest.Mock).mock.calls[0]).toEqual([
        { where: { id: 'item-1' } },
      ]);
    });
  });
});
