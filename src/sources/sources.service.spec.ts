import { Test, TestingModule } from '@nestjs/testing';
import { SourcesService } from './sources.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SourcesService', () => {
  let service: SourcesService;
  let prisma: PrismaService;

  const mockSource = {
    id: 'source-1',
    name: '每日巡逻',
    type: 'DAILY',
    category: '日常',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourcesService,
        {
          provide: PrismaService,
          useValue: {
            source: {
              findUnique: jest.fn().mockImplementation(({ where: { id, name } }) => {
                if (id === 'source-1' || name === '每日巡逻') return Promise.resolve(mockSource);
                return Promise.resolve(null);
              }),
              findMany: jest.fn().mockResolvedValue([mockSource]),
              create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'source-new', ...data })),
              update: jest.fn().mockImplementation(({ where: { id }, data }) => Promise.resolve({ ...mockSource, id, ...data })),
              delete: jest.fn().mockResolvedValue(mockSource),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SourcesService>(SourcesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create new source if name is unique', async () => {
      jest.spyOn(prisma.source, 'findUnique').mockResolvedValue(null);
      const dto = { name: '公会探索', type: 'WEEKLY', category: '公会' };
      const res = await service.create(dto);
      expect(res.name).toBe('公会探索');
    });

    it('should throw ConflictException if source name already exists', async () => {
      const dto = { name: '每日巡逻', type: 'DAILY', category: '日常' };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return list of sources', async () => {
      const list = await service.findAll();
      expect(list).toEqual([mockSource]);
    });
  });

  describe('findOne', () => {
    it('should return source by id', async () => {
      const res = await service.findOne('source-1');
      expect(res.id).toBe('source-1');
    });

    it('should throw NotFoundException if source not found', async () => {
      await expect(service.findOne('source-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update source name successfully', async () => {
      (jest.spyOn(prisma.source, 'findUnique') as any).mockImplementation(({ where: { id, name } }: any) => {
        if (id === 'source-1') return Promise.resolve(mockSource);
        if (name === '重命名途径') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      const res = await service.update('source-1', { name: '重命名途径' });
      expect(res.name).toBe('重命名途径');
    });

    it('should throw ConflictException if updated name conflicts with another source', async () => {
      (jest.spyOn(prisma.source, 'findUnique') as any).mockImplementation(({ where: { id, name } }: any) => {
        if (id === 'source-1') return Promise.resolve(mockSource);
        if (name === '已存在途径') return Promise.resolve({ id: 'source-2', name: '已存在途径' } as any);
        return Promise.resolve(null);
      });
      await expect(service.update('source-1', { name: '已存在途径' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete source', async () => {
      const res = await service.remove('source-1');
      expect(res.id).toBe('source-1');
      expect(prisma.source.delete).toHaveBeenCalledWith({ where: { id: 'source-1' } });
    });
  });
});
