import { Test, TestingModule } from '@nestjs/testing';
import { WikiService } from './wiki.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WikiService', () => {
  let service: WikiService;
  const mockPrisma = {
    wikiEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    progressionMatrix: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    strategyArticle: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WikiService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WikiService>(WikiService);
  });

  it('should return parsed wiki entries and filter by tag or query', async () => {
    mockPrisma.wikiEntry.findMany.mockResolvedValue([
      {
        id: '1',
        slug: 'collectible-golden-cutlery',
        name: '黄金餐具',
        category: 'COLLECTIBLE',
        subcategory: '史诗收藏品',
        edition: '第1期',
        rarity: 'EPIC',
        tier: '暴击核心',
        icon: '/wiki-assets/收藏品/史诗收藏品/第1期/黄金餐具.png',
        summary: '第1期核心暴击率金收藏，红3解锁暴击率+5%',
        tags: JSON.stringify(['暴击率', '第1期', '金收藏']),
        attributes: JSON.stringify({
          baseStats: ['攻击+800'],
          milestones: [{ stage: '红3星', effect: '暴击率+5%', isKeyNode: true }],
        }),
        relatedArticleSlugs: JSON.stringify(['resources-1-10']),
        sort: 1,
        enabled: true,
      },
    ]);

    const res = await service.findEntries({ category: 'COLLECTIBLE', tag: '暴击率' });
    expect(res).toHaveLength(1);
    expect(res[0].tags).toContain('暴击率');
    expect(res[0].attributes.milestones[0].isKeyNode).toBe(true);
  });

  it('should return parsed progression matrices', async () => {
    mockPrisma.progressionMatrix.findMany.mockResolvedValue([
      {
        id: 'm1',
        code: 'pet-core-nodes',
        title: '异宠核心消耗节点表',
        category: 'PET',
        summary: '异宠核心最优投入阶梯',
        columns: JSON.stringify([{ key: 'stage', label: '阶段' }]),
        rows: JSON.stringify([{ stage: '红1觉醒', cost: 15 }]),
        recommendations: JSON.stringify([
          { tier: '微氪', target: '30核心', reason: '性价比最高' },
        ]),
        relatedArticleSlug: 'resources-pet-core',
        sort: 1,
        enabled: true,
      },
    ]);

    const matrices = await service.findMatrices();
    expect(matrices).toHaveLength(1);
    expect(matrices[0].columns[0].key).toBe('stage');
    expect(matrices[0].rows[0].cost).toBe(15);
  });
});
