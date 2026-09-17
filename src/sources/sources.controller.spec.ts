import { Test, TestingModule } from '@nestjs/testing';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ConfigService } from '@nestjs/config';

describe('SourcesController', () => {
  let controller: SourcesController;
  let service: SourcesService;

  const mockSource = { id: 'source-1', name: '每日巡逻', type: 'DAILY' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SourcesController],
      providers: [
        {
          provide: SourcesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockSource),
            findAll: jest.fn().mockResolvedValue([mockSource]),
            findOne: jest.fn().mockResolvedValue(mockSource),
            update: jest.fn().mockImplementation((id, dto) => Promise.resolve({ ...mockSource, id, ...dto })),
            remove: jest.fn().mockResolvedValue(mockSource),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock_api_key'),
          },
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SourcesController>(SourcesController);
    service = module.get<SourcesService>(SourcesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a source', async () => {
    const dto = { name: '每日巡逻', type: 'DAILY', category: '日常' };
    const res = await controller.create(dto);
    expect(res).toEqual(mockSource);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should find all sources', async () => {
    const res = await controller.findAll();
    expect(res).toEqual([mockSource]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should find one source by id', async () => {
    const res = await controller.findOne('source-1');
    expect(res).toEqual(mockSource);
    expect(service.findOne).toHaveBeenCalledWith('source-1');
  });

  it('should update a source via patch', async () => {
    const res = await controller.update('source-1', { name: '新名称' });
    expect(res.name).toBe('新名称');
    expect(service.update).toHaveBeenCalledWith('source-1', { name: '新名称' });
  });

  it('should remove a source', async () => {
    const res = await controller.remove('source-1');
    expect(res).toEqual(mockSource);
    expect(service.remove).toHaveBeenCalledWith('source-1');
  });
});
