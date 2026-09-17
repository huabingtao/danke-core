import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  };

  it('should allow access when no permission is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext(null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user is not present in request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('item:create');
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access if user has ADMIN role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('item:create');
    const context = createMockContext({ role: 'ADMIN', permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user permissions include required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('item:create');
    const context = createMockContext({ role: 'ASSISTANT', permissions: ['item:create'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('item:create');
    const context = createMockContext({ role: 'ASSISTANT', permissions: ['items:view'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
