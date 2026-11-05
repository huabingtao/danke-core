import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AgentsController } from '../agents/agents.controller';
import { SourcesController } from '../sources/sources.controller';
import { ReminderController } from '../modules/reminder/reminder.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSION_KEY } from './require-permission.decorator';

describe('sensitive controller routes require server-side authorization', () => {
  type ControllerType = { prototype: object };
  const protectedRoutes: Array<[ControllerType, string, string]> = [
    [SourcesController, 'create', 'yield:edit'],
    [SourcesController, 'update', 'yield:edit'],
    [SourcesController, 'updatePut', 'yield:edit'],
    [SourcesController, 'remove', 'yield:edit'],
    [ReminderController, 'create', 'reminders:manage'],
    [ReminderController, 'update', 'reminders:manage'],
    [ReminderController, 'toggle', 'reminders:manage'],
    [ReminderController, 'remove', 'reminders:manage'],
    [AgentsController, 'upsert', 'agent:manage'],
  ];

  it.each(protectedRoutes)(
    '%s.%s requires JWT and %s',
    (controller, method, permission) => {
      const handler = Reflect.get(controller.prototype, method);
      const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(PermissionsGuard);
      expect(Reflect.getMetadata(PERMISSION_KEY, handler)).toBe(permission);
    },
  );
});
