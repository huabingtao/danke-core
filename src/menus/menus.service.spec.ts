import { Test, TestingModule } from '@nestjs/testing';
import { MenusService } from './menus.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('MenusService', () => {
  let service: MenusService;
  let prisma: PrismaService;

  const mockMenu = {
    id: 'menu-1',
    name: '产出看板',
    path: '/',
    sort: 1,
    parentId: null,
    permissionCode: 'yields:view',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenusService,
        {
          provide: PrismaService,
          useValue: {
            menu: {
              findUnique: jest.fn().mockImplementation(({ where: { id, name } }) => {
                if (id === 'menu-1' || name === '产出看板') return Promise.resolve(mockMenu);
                return Promise.resolve(null);
              }),
              findMany: jest.fn().mockResolvedValue([mockMenu]),
              create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'menu-new', ...data })),
              update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockMenu, ...data })),
              delete: jest.fn().mockResolvedValue(mockMenu),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MenusService>(MenusService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create menu when name is unique', async () => {
      jest.spyOn(prisma.menu, 'findUnique').mockResolvedValue(null);
      const dto = { name: '新菜单', path: '/new', sort: 2 };
      const res = await service.create(dto);
      expect(res.name).toBe('新菜单');
    });

    it('should throw ConflictException if menu name already exists', async () => {
      const dto = { name: '产出看板', path: '/' };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return sorted menus', async () => {
      const list = await service.findAll();
      expect(list).toEqual([mockMenu]);
    });
  });

  describe('findOne', () => {
    it('should return menu by id', async () => {
      const res = await service.findOne('menu-1');
      expect(res.id).toBe('menu-1');
    });

    it('should throw NotFoundException if menu not found', async () => {
      await expect(service.findOne('menu-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update menu attributes', async () => {
      const dto = { name: '修改后看板', sort: 5 };
      const res = await service.update('menu-1', dto);
      expect(res.sort).toBe(5);
    });

    it('should throw ConflictException if renamed menu conflicts with another menu', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'menu-1', name: '原菜单' } as any);
      jest.spyOn(prisma.menu, 'findUnique').mockResolvedValue({ id: 'menu-2', name: '已存在菜单' } as any);
      await expect(service.update('menu-1', { name: '已存在菜单' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete menu', async () => {
      const res = await service.remove('menu-1');
      expect(res.id).toBe('menu-1');
    });
  });
});
