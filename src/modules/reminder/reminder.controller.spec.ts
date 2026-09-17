import { Test, TestingModule } from '@nestjs/testing';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

describe('ReminderController', () => {
  let controller: ReminderController;
  let service: ReminderService;

  const mockRule = {
    id: 'rule-1',
    name: '公会远征提醒',
    category: 'START_END',
    ruleType: 'ROUTINE',
    routineType: 'WEEKLY',
    weeklyDay: 0,
    dailyTime: '20:00',
    enabled: true,
    content: '公会远征快结束了！',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReminderController],
      providers: [
        {
          provide: ReminderService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([mockRule]),
            findOne: jest.fn().mockResolvedValue(mockRule),
            create: jest.fn().mockResolvedValue({ id: 'rule-2', name: '新规则' }),
            update: jest.fn().mockResolvedValue({ ...mockRule, enabled: false }),
            toggleEnabled: jest.fn().mockResolvedValue({ ...mockRule, enabled: false }),
            remove: jest.fn().mockResolvedValue(mockRule),
          },
        },
      ],
    }).compile();

    controller = module.get<ReminderController>(ReminderController);
    service = module.get<ReminderService>(ReminderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all reminder rules', async () => {
    const rules = await controller.findAll();
    expect(rules).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should toggle rule enabled state', async () => {
    const res = await controller.toggle('rule-1');
    expect(res.enabled).toBe(false);
    expect(service.toggleEnabled).toHaveBeenCalledWith('rule-1');
  });

  it('should find one reminder rule by id', async () => {
    const res = await controller.findOne('rule-1');
    expect(res).toEqual(mockRule);
    expect(service.findOne).toHaveBeenCalledWith('rule-1');
  });

  it('should create a reminder rule', async () => {
    const dto = { name: '新规则', ruleType: 'CYCLE' as const };
    const res = await controller.create(dto);
    expect(res.id).toBe('rule-2');
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should remove a reminder rule', async () => {
    const res = await controller.remove('rule-1');
    expect(res).toEqual(mockRule);
    expect(service.remove).toHaveBeenCalledWith('rule-1');
  });
});
