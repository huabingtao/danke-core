import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    username: 'admin',
    password: 'hashed_password',
    role: {
      id: 'role-1',
      code: 'ADMIN',
      name: '超级博主',
      permissions: [
        { id: 'perm-1', code: 'items:view', name: '查看物品' },
        { id: 'perm-2', code: 'item:create', name: '创建物品' },
      ],
    },
  };

  const mockMenus = [
    { id: 'menu-1', name: '产出看板', path: '/', sort: 1, parentId: null, permissionCode: null },
    { id: 'menu-2', name: '物品配置', path: '/items', sort: 2, parentId: null, permissionCode: 'items:view' },
    { id: 'menu-3', name: '子菜单', path: '/items/sub', sort: 1, parentId: 'menu-2', permissionCode: 'items:view' },
    { id: 'menu-4', name: '隐藏菜单', path: '/secret', sort: 3, parentId: null, permissionCode: 'secret:view' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockImplementation(({ where: { username, id } }) => {
                if (username === 'admin' || id === 'user-1') return Promise.resolve(mockUser);
                return Promise.resolve(null);
              }),
            },
            menu: {
              findMany: jest.fn().mockResolvedValue(mockMenus),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock_access_token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password on valid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const res = await service.validateUser('admin', 'password123');
      expect(res.id).toBe('user-1');
      expect(res.username).toBe('admin');
      expect(res.password).toBeUndefined();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      await expect(service.validateUser('nonexistent', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser('admin', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should return access_token', async () => {
      const res = await service.login({ id: 'user-1', username: 'admin' });
      expect(res).toEqual({ access_token: 'mock_access_token' });
      expect(jwtService.sign).toHaveBeenCalledWith({ username: 'admin', sub: 'user-1' });
    });
  });

  describe('getProfile', () => {
    it('should return profile with filtered menu tree for admin', async () => {
      const res = await service.getProfile('user-1');
      expect(res.user.id).toBe('user-1');
      expect(res.user.role).toBe('ADMIN');
      expect(res.menuTree.length).toBeGreaterThan(0);
      expect(res.permissions).toEqual(['items:view', 'item:create']);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      await expect(service.getProfile('unknown-id')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully when old password matches', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      prisma.user.update = jest.fn().mockResolvedValue({ id: 'user-1' });

      const res = await service.changePassword('user-1', 'oldPass123', 'newPass123');
      expect(res.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new_hashed_password' },
      });
    });

    it('should throw UnauthorizedException if new password is too short', async () => {
      await expect(service.changePassword('user-1', 'oldPass123', '123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      await expect(service.changePassword('unknown-id', 'oldPass123', 'newPass123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if old password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.changePassword('user-1', 'wrongOld', 'newPass123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
