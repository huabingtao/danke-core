import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser = { id: 'user-1', username: 'admin' };
  const mockToken = { access_token: 'jwt_token_xyz' };
  const mockProfile = {
    user: { id: 'user-1', username: 'admin', role: 'ADMIN', roleName: '超级博主' },
    permissions: ['items:view'],
    menus: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn().mockResolvedValue(mockUser),
            login: jest.fn().mockResolvedValue(mockToken),
            getProfile: jest.fn().mockResolvedValue(mockProfile),
            changePassword: jest.fn().mockResolvedValue({ success: true, message: '密码修改成功' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login and return access_token', async () => {
    const res = await controller.login({ username: 'admin', password: 'password123' });
    expect(service.validateUser).toHaveBeenCalledWith('admin', 'password123');
    expect(service.login).toHaveBeenCalledWith(mockUser);
    expect(res).toEqual(mockToken);
  });

  it('should return user profile', async () => {
    const req = { user: { userId: 'user-1' } };
    const res = await controller.getProfile(req);
    expect(service.getProfile).toHaveBeenCalledWith('user-1');
    expect(res).toEqual(mockProfile);
  });

  it('should change user password', async () => {
    const req = { user: { userId: 'user-1' } };
    const body = { oldPassword: 'old123', newPassword: 'new123' };
    jest.spyOn(service, 'changePassword').mockResolvedValue({ success: true, message: '密码修改成功' });
    const res = await controller.changePassword(req, body);
    expect(res).toEqual({ success: true, message: '密码修改成功' });
    expect(service.changePassword).toHaveBeenCalledWith('user-1', 'old123', 'new123');
  });
});
