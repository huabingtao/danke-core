import { Test, TestingModule } from '@nestjs/testing';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';

describe('MenusController', () => {
  let controller: MenusController;
  let service: MenusService;

  const mockMenu = { id: 'menu-1', name: '产出看板', path: '/', sort: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenusController],
      providers: [
        {
          provide: MenusService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockMenu),
            findAll: jest.fn().mockResolvedValue([mockMenu]),
            findOne: jest.fn().mockResolvedValue(mockMenu),
            update: jest.fn().mockResolvedValue({ ...mockMenu, sort: 2 }),
            remove: jest.fn().mockResolvedValue(mockMenu),
          },
        },
      ],
    }).compile();

    controller = module.get<MenusController>(MenusController);
    service = module.get<MenusService>(MenusService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a menu', async () => {
    const dto = { name: '产出看板', path: '/', sort: 1 };
    const res = await controller.create(dto);
    expect(res).toEqual(mockMenu);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should find all menus', async () => {
    const res = await controller.findAll();
    expect(res).toEqual([mockMenu]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should find one menu by id', async () => {
    const res = await controller.findOne('menu-1');
    expect(res).toEqual(mockMenu);
    expect(service.findOne).toHaveBeenCalledWith('menu-1');
  });

  it('should update a menu', async () => {
    const dto = { sort: 2 };
    const res = await controller.update('menu-1', dto);
    expect(res.sort).toBe(2);
    expect(service.update).toHaveBeenCalledWith('menu-1', dto);
  });

  it('should remove a menu', async () => {
    const res = await controller.remove('menu-1');
    expect(res).toEqual(mockMenu);
    expect(service.remove).toHaveBeenCalledWith('menu-1');
  });
});
