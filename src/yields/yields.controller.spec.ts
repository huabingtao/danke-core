import { Test, TestingModule } from '@nestjs/testing';
import { YieldsController } from './yields.controller';
import { YieldsService } from './yields.service';

describe('YieldsController', () => {
  let controller: YieldsController;
  let service: YieldsService;

  const mockYield = { id: 'yield-1', itemId: 'item-1', amount: 100, month: 8, year: 2026 };
  const mockReport = { year: 2026, month: 8, columns: [], rows: [] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YieldsController],
      providers: [
        {
          provide: YieldsService,
          useValue: {
            createOrUpdate: jest.fn().mockResolvedValue(mockYield),
            findAll: jest.fn().mockResolvedValue([mockYield]),
            getMonthlyReport: jest.fn().mockResolvedValue(mockReport),
          },
        },
      ],
    }).compile();

    controller = module.get<YieldsController>(YieldsController);
    service = module.get<YieldsService>(YieldsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create or update yield', async () => {
    const dto = { itemId: 'item-1', sourceId: 'source-1', amount: 100, month: 8, year: 2026 };
    const res = await controller.createOrUpdate(dto);
    expect(res).toEqual(mockYield);
    expect(service.createOrUpdate).toHaveBeenCalledWith(dto);
  });

  it('should find all yields', async () => {
    const query = { year: '2026', month: '8' };
    const res = await controller.findAll(query);
    expect(res).toEqual([mockYield]);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('should get monthly report', async () => {
    const res = await controller.getMonthlyReport('2026', '8');
    expect(res).toEqual(mockReport);
    expect(service.getMonthlyReport).toHaveBeenCalledWith(2026, 8);
  });
});
