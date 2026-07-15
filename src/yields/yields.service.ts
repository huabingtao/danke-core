import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateYieldDto } from './dto/create-yield.dto';
import { QueryYieldDto } from './dto/query-yield.dto';

@Injectable()
export class YieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdate(dto: CreateYieldDto) {
    // 1. 验证物品是否存在
    const item = await this.prisma.item.findUnique({
      where: { id: dto.itemId },
    });
    if (!item) {
      throw new NotFoundException(`ID 为 "${dto.itemId}" 的物品不存在`);
    }

    // 2. 验证途径是否存在
    const source = await this.prisma.source.findUnique({
      where: { id: dto.sourceId },
    });
    if (!source) {
      throw new NotFoundException(`ID 为 "${dto.sourceId}" 的产出途径不存在`);
    }

    // 3. 验证活动是否存在（如果传了 eventId）
    if (dto.eventId) {
      const event = await this.prisma.gameEvent.findUnique({
        where: { id: dto.eventId },
      });
      if (!event) {
        throw new NotFoundException(`ID 为 "${dto.eventId}" 的活动不存在`);
      }
    }

    // 4. 使用 upsert 进行创建或覆盖更新
    return this.prisma.monthlyYield.upsert({
      where: {
        itemId_sourceId_month_year: {
          itemId: dto.itemId,
          sourceId: dto.sourceId,
          month: dto.month,
          year: dto.year,
        },
      },
      update: {
        amount: dto.amount,
        eventId: dto.eventId || null,
        notes: dto.notes || null,
      },
      create: {
        itemId: dto.itemId,
        sourceId: dto.sourceId,
        eventId: dto.eventId || null,
        amount: dto.amount,
        month: dto.month,
        year: dto.year,
        notes: dto.notes || null,
      },
      include: {
        item: true,
        source: true,
        event: true,
      },
    });
  }

  async findAll(query: QueryYieldDto) {
    const where: any = {};

    if (query.year) {
      where.year = parseInt(query.year, 10);
    }
    if (query.month) {
      where.month = parseInt(query.month, 10);
    }
    if (query.itemId) {
      where.itemId = query.itemId;
    }
    if (query.sourceId) {
      where.sourceId = query.sourceId;
    }

    return this.prisma.monthlyYield.findMany({
      where,
      include: {
        item: true,
        source: true,
        event: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getMonthlyReport(year: number, month: number) {
    // 1. 查询该月份所有的产出记录
    const yields = await this.prisma.monthlyYield.findMany({
      where: { year, month },
      include: {
        item: true,
        source: true,
        event: true,
      },
    });

    // 2. 提取出所有出现过的 Source（途径）作为表格的“列”
    const sourceMap = new Map<string, any>();
    yields.forEach((y: any) => {
      if (!sourceMap.has(y.sourceId)) {
        sourceMap.set(y.sourceId, {
          id: y.source.id,
          name: y.source.name,
          type: y.source.type,
        });
      }
    });
    const columns = Array.from(sourceMap.values());

    // 3. 按 Item（物品）聚合并计算产出矩阵
    const itemMap = new Map<string, any>();
    yields.forEach((y: any) => {
      if (!itemMap.has(y.itemId)) {
        itemMap.set(y.itemId, {
          id: y.item.id,
          name: y.item.name,
          type: y.item.type,
          yields: {},
          total: 0,
        });
      }

      const itemReport = itemMap.get(y.itemId);
      // 在对应的途径 ID 下记录产出
      itemReport.yields[y.sourceId] = y.amount;
      itemReport.total += y.amount;
    });

    const rows = Array.from(itemMap.values());

    return {
      year,
      month,
      columns, // 列：所有途径
      rows, // 行：物品及对应的各项途径产出和总计
    };
  }
}
