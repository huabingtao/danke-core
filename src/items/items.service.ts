import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItemDto) {
    const existing = await this.prisma.item.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`名称为 "${dto.name}" 的物品已存在`);
    }

    const statsString = dto.stats ? JSON.stringify(dto.stats) : null;

    const item = await this.prisma.item.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        stats: statsString,
      },
    });

    return this.parseItemStats(item);
  }

  async findAll() {
    const items = await this.prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item: any) => this.parseItemStats(item));
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`ID 为 "${id}" 的物品未找到`);
    }

    return this.parseItemStats(item);
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    const deleted = await this.prisma.item.delete({
      where: { id },
    });
    return this.parseItemStats(deleted);
  }

  // 辅助方法：将数据库中存储的 String 格式 stats 转回 JSON 对象返回给前端
  private parseItemStats(item: any) {
    if (item && typeof item.stats === 'string') {
      try {
        item.stats = JSON.parse(item.stats);
      } catch {
        item.stats = null;
      }
    }
    return item;
  }
}
