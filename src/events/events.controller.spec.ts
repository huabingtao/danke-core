import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PERMISSION_KEY } from '../auth/require-permission.decorator';

describe('EventsController', () => {
  const service = {
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'event-1' }),
    update: jest.fn().mockResolvedValue({ id: 'event-1' }),
    remove: jest.fn().mockResolvedValue({ id: 'event-1' }),
  };
  const controller = new EventsController(service as unknown as EventsService);

  it('delegates event CRUD operations to the service', async () => {
    const input = {
      name: '新活动',
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-08T00:00:00.000Z',
      rewards: '奖励摘要',
    };
    await controller.findAll();
    await controller.create(input);
    await controller.update('event-1', { name: '活动改名' });
    await controller.remove('event-1');

    expect(service.findAll).toHaveBeenCalled();
    expect(service.create).toHaveBeenCalledWith(input);
    expect(service.update).toHaveBeenCalledWith('event-1', {
      name: '活动改名',
    });
    expect(service.remove).toHaveBeenCalledWith('event-1');
  });

  it.each([
    ['findAll', 'events:view'],
    ['create', 'event:create'],
    ['update', 'event:create'],
    ['remove', 'event:delete'],
  ])('%s requires JWT and %s', (method, permission) => {
    const handler = Reflect.get(EventsController.prototype, method);
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(PermissionsGuard);
    expect(Reflect.getMetadata(PERMISSION_KEY, handler)).toBe(permission);
  });
});
