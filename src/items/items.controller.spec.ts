import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

describe('ItemsController', () => {
  let controller: ItemsController;
  let service: ItemsService;

  const mockItem = { id: 'item-1', name: '钻石', type: 'CURRENCY' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockItem),
            findAll: jest.fn().mockResolvedValue([mockItem]),
            findOne: jest.fn().mockResolvedValue(mockItem),
            update: jest.fn().mockResolvedValue({ ...mockItem, name: '更新物品' }),
            remove: jest.fn().mockResolvedValue(mockItem),
          },
        },
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
    service = module.get<ItemsService>(ItemsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create an item', async () => {
    const dto = { name: '钻石', type: 'CURRENCY' };
    const res = await controller.create(dto);
    expect(res).toEqual(mockItem);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should find all items', async () => {
    const res = await controller.findAll();
    expect(res).toEqual([mockItem]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should find one item by id', async () => {
    const res = await controller.findOne('item-1');
    expect(res).toEqual(mockItem);
    expect(service.findOne).toHaveBeenCalledWith('item-1');
  });

  it('should update an item', async () => {
    const dto = { name: '更新物品' };
    const res = await controller.update('item-1', dto);
    expect(res.name).toBe('更新物品');
    expect(service.update).toHaveBeenCalledWith('item-1', dto);
  });

  it('should remove an item', async () => {
    const res = await controller.remove('item-1');
    expect(res).toEqual(mockItem);
    expect(service.remove).toHaveBeenCalledWith('item-1');
  });
});
