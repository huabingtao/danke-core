import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('未登录或未认证身份');
    }

    // Admin has all permissions represented by '*' or 'ADMIN' role code
    const isSuperUser = user.role === 'ADMIN' || user.permissions.includes('*');
    if (isSuperUser) {
      return true;
    }

    const hasPermission = user.permissions.includes(requiredPermission);
    if (!hasPermission) {
      throw new ForbiddenException(`无权限访问该资源，需要权限: ${requiredPermission}`);
    }

    return true;
  }
}
