import { IDENTITY_KEYS, mergedInto } from './item-identity';
import {
  GEM_VALUATION_KEY,
  parseStats,
  updateValuation,
} from './gem-valuation';
import {
  CLASSIFICATION_INCLUDE,
  ItemClassificationsService,
} from '../item-classifications/item-classifications.service';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classifications: ItemClassificationsService,
  ) {}

  async create(dto: CreateItemDto) {
    await this.classifications.validate(dto);
    const existing = await this.prisma.item.findUnique({
      where: { name: dto.name },
    });

    if (existing && mergedInto(existing.stats))
      return this.findOne(existing.id);
    if (existing) {
      throw new ConflictException(`名称为 "${dto.name}" 的物品已存在`);
    }

    if (
      dto.stats &&
      [GEM_VALUATION_KEY, ...IDENTITY_KEYS].some((key) => key in dto.stats!)
    )
      throw new BadRequestException('请使用 gemValuation 更新钻石价值');
    const stats = parseStats(dto.stats);
    if (dto.gemValuation)
      stats[GEM_VALUATION_KEY] = updateValuation(undefined, dto.gemValuation);
    const statsString = Object.keys(stats).length
      ? JSON.stringify(stats)
      : null;

    const item = await this.prisma.item.create({
      data: {
        name: dto.name,
        resourceTypeId: dto.resourceTypeId,
        categories: dto.categoryIds
          ? { create: dto.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        icon: dto.icon || null,
        type: dto.type || 'RESOURCE',
        description: dto.description,
        stats: statsString,
      },
      include: CLASSIFICATION_INCLUDE,
    });

    return this.parseItemStats(item);
  }

  async findAll() {
    const items = await this.prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
      include: CLASSIFICATION_INCLUDE,
    });
    return items
      .filter((item) => !mergedInto(item.stats))
      .map((item: any) => this.parseItemStats(item));
  }

  async findOne(id: string) {
    let item = await this.prisma.item.findUnique({
      where: { id },
      include: CLASSIFICATION_INCLUDE,
    });

    const visited = new Set<string>();
    while (item && mergedInto(item.stats)) {
      if (visited.has(item.id)) throw new BadRequestException('道具别名循环');
      visited.add(item.id);
      item = await this.prisma.item.findUnique({
        where: { id: mergedInto(item.stats) },
        include: CLASSIFICATION_INCLUDE,
      });
    }

    if (!item) {
      throw new NotFoundException(`ID 为 "${id}" 的物品未找到`);
    }

    return this.parseItemStats(item);
  }

  async update(id: string, dto: UpdateItemDto) {
    await this.classifications.validate(dto);
    const item = await this.findOne(id);
    id = item.id;

    if (dto.name && dto.name !== item.name) {
      const conflict = await this.prisma.item.findUnique({
        where: { name: dto.name },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`名称为 "${dto.name}" 的物品已存在`);
      }
    }

    const dataToUpdate: any = {};
    if (dto.resourceTypeId !== undefined)
      dataToUpdate.resourceTypeId = dto.resourceTypeId;
    if (dto.categoryIds !== undefined)
      dataToUpdate.categories = {
        deleteMany: {},
        create: dto.categoryIds.map((categoryId) => ({ categoryId })),
      };
    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.icon !== undefined) dataToUpdate.icon = dto.icon;
    if (dto.type !== undefined) dataToUpdate.type = dto.type;
    if (dto.description !== undefined)
      dataToUpdate.description = dto.description;
    if (
      dto.stats &&
      [GEM_VALUATION_KEY, ...IDENTITY_KEYS].some((key) => key in dto.stats!)
    )
      throw new BadRequestException('请使用 gemValuation 更新钻石价值');
    const write = async (tx: Pick<PrismaService, 'item'>) => {
      if (dto.stats !== undefined || dto.gemValuation !== undefined) {
        const current = await tx.item.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('道具不存在');
        const old = parseStats(current.stats);
        const stats =
          dto.stats !== undefined ? parseStats(dto.stats) : { ...old };
        for (const key of [GEM_VALUATION_KEY, ...IDENTITY_KEYS]) {
          if (old[key] !== undefined) stats[key] = old[key];
        }
        if (dto.gemValuation)
          stats[GEM_VALUATION_KEY] = updateValuation(
            old[GEM_VALUATION_KEY],
            dto.gemValuation,
          );
        dataToUpdate.stats = Object.keys(stats).length
          ? JSON.stringify(stats)
          : null;
      }
      return tx.item.update({
        where: { id },
        data: dataToUpdate,
        include: CLASSIFICATION_INCLUDE,
      });
    };
    const updated =
      dto.stats !== undefined || dto.gemValuation !== undefined
        ? await this.prisma.$transaction(write)
        : await write(this.prisma);

    return this.parseItemStats(updated);
  }

  async remove(id: string) {
    const target = await this.findOne(id);
    if (target.id !== id)
      throw new ConflictException('道具已合并，请刷新后操作正式道具');
    const deleted = await this.prisma.item.delete({
      where: { id },
    });
    return this.parseItemStats(deleted);
  }

  // 辅助方法：将数据库中存储的 String 格式 stats 转回 JSON 对象返回给前端
  private parseItemStats(value: any) {
    const item = value ? { ...value } : value;
    if (item?.categories) {
      item.categoryIds = item.categories.map(
        (link: { categoryId: string }) => link.categoryId,
      );
      item.categories = item.categories.map(
        (link: { category: unknown }) => link.category,
      );
    }
    if (item && typeof item.stats === 'string') {
      try {
        item.stats = JSON.parse(item.stats);
      } catch {
        item.stats = null;
      }
    }
    if (item)
      item.aliasIds = (item.stats?._itemAliases ?? []).map(
        (alias: { id: string }) => alias.id,
      );
    if (item)
      item.aliases = [
        ...new Set([
          ...(item.stats?._previousNames ?? []),
          ...(item.stats?._itemAliases ?? []).map(
            (alias: { name: string }) => alias.name,
          ),
        ]),
      ];
    if (item) item.gemValuation = item.stats?.[GEM_VALUATION_KEY] ?? null;
    return item;
  }
}
