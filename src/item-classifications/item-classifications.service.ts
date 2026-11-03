import { canonicalIds } from '../items/item-identity';
import {
  RESOURCE_VIEWS,
  FLAT_CATEGORIES,
  resourceViewWhere,
  preferenceViewKey,
} from './resource-views';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BulkClassificationDto,
  ClassificationFields,
} from './classifications.dto';

export const CLASSIFICATION_INCLUDE = {
  categories: { include: { category: true } },
  resourceType: true,
} as const;

@Injectable()
export class ItemClassificationsService {
  constructor(private readonly prisma: PrismaService) {}

  dictionaries() {
    return Promise.all([
      this.prisma.itemCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.resourceType.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]).then(([categories, resourceTypes]) => ({
      categories: categories.map((category) => ({
        ...category,
        icon:
          FLAT_CATEGORIES.find((entry) => entry.id === category.id)?.icon ??
          null,
      })),
      resourceTypes,
      views: RESOURCE_VIEWS,
    }));
  }

  async validate(fields: ClassificationFields) {
    if (fields.categoryIds !== undefined) {
      const ids = [...new Set(fields.categoryIds)];
      const found = await this.prisma.itemCategory.count({
        where: { id: { in: ids } },
      });
      if (found !== ids.length) throw new BadRequestException('一级分类不存在');
    }
    if (fields.resourceTypeId != null) {
      const found = await this.prisma.resourceType.findUnique({
        where: { id: fields.resourceTypeId },
      });
      if (!found) throw new BadRequestException('资源类型不存在');
    }
  }

  async bulk(dto: BulkClassificationDto) {
    await this.validate(dto);
    const itemIds = await this.normalizeIds(dto.itemIds);
    return this.prisma.$transaction(async (tx) => {
      if (
        (await tx.item.count({ where: { id: { in: itemIds } } })) !==
        itemIds.length
      ) {
        throw new BadRequestException('部分道具不存在，请刷新后重试');
      }
      for (const id of itemIds) {
        await tx.item.update({
          where: { id },
          data: {
            ...(dto.resourceTypeId !== undefined
              ? { resourceTypeId: dto.resourceTypeId }
              : {}),
            ...(dto.categoryIds !== undefined
              ? {
                  categories: {
                    deleteMany: {},
                    create: dto.categoryIds.map((categoryId) => ({
                      categoryId,
                    })),
                  },
                }
              : {}),
          },
        });
      }
      return { updated: itemIds.length };
    });
  }

  private async normalizeIds(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.prisma.item.findMany({
      select: { id: true, stats: true },
    });
    return canonicalIds(ids, rows);
  }

  async preference(userId: string, viewId = 'all') {
    const viewKey = preferenceViewKey(viewId);
    const row = await this.prisma.userViewPreference.findUnique({
      where: { userId_viewKey: { userId, viewKey } },
    });
    if (!row) return { selectedItemIds: null };
    const ids = await this.normalizeIds(
      JSON.parse(row.selectedItemIds) as string[],
    );
    const existing = await this.prisma.item.findMany({
      where: { id: { in: ids }, ...resourceViewWhere(viewId) },
      select: { id: true },
    });
    const known = new Set(existing.map((item) => item.id));
    return { selectedItemIds: ids.filter((id) => known.has(id)) };
  }

  async savePreference(userId: string, ids: string[], viewId = 'all') {
    const viewKey = preferenceViewKey(viewId);
    ids = await this.normalizeIds(ids);
    if (
      (await this.prisma.item.count({
        where: { id: { in: ids }, ...resourceViewWhere(viewId) },
      })) !== ids.length
    )
      throw new BadRequestException(
        '部分道具已删除或不属于当前维度，请刷新后重试',
      );
    await this.prisma.userViewPreference.upsert({
      where: { userId_viewKey: { userId, viewKey } },
      create: {
        userId,
        viewKey,
        selectedItemIds: JSON.stringify(ids),
      },
      update: { selectedItemIds: JSON.stringify(ids) },
    });
    return { selectedItemIds: ids };
  }
}
