import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-1',
    username: 'admin',
    role: {
      code: 'ADMIN',
      permissions: [{ code: 'items:view' }],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
                if (id === 'user-1') return Promise.resolve(mockUser);
                return Promise.resolve(null);
              }),
            },
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user payload', async () => {
    const payload = { sub: 'user-1', username: 'admin' };
    const res = await strategy.validate(payload);
    expect(res).toEqual({
      userId: 'user-1',
      username: 'admin',
      role: 'ADMIN',
      permissions: ['items:view'],
    });
  });

  it('should throw UnauthorizedException if user not found', async () => {
    const payload = { sub: 'user-unknown', username: 'unknown' };
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
