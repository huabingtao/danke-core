import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.gameEvent.findMany({
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateEventDto) {
    if (typeof dto.name !== 'string' || !dto.name.trim()) {
      throw new BadRequestException('活动名称不能为空');
    }
    this.ensureRewards(dto.rewards);
    const { startDate, endDate } = this.toDates(dto.startDate, dto.endDate);
    return this.prisma.gameEvent.create({
      data: {
        name: dto.name.trim(),
        startDate,
        endDate,
        rewards: dto.rewards?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.gameEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`活动 ${id} 不存在`);
    if (
      dto.name !== undefined &&
      (typeof dto.name !== 'string' || !dto.name.trim())
    ) {
      throw new BadRequestException('活动名称不能为空');
    }
    if (dto.startDate !== undefined && typeof dto.startDate !== 'string') {
      throw new BadRequestException('活动开始时间格式无效');
    }
    if (dto.endDate !== undefined && typeof dto.endDate !== 'string') {
      throw new BadRequestException('活动结束时间格式无效');
    }
    this.ensureRewards(dto.rewards);

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    this.ensureDateRange(startDate, endDate);

    return this.prisma.gameEvent.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.startDate ? { startDate } : {}),
        ...(dto.endDate ? { endDate } : {}),
        ...(dto.rewards !== undefined
          ? { rewards: dto.rewards?.trim() || null }
          : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.gameEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`活动 ${id} 不存在`);
    return this.prisma.gameEvent.delete({ where: { id } });
  }

  private toDates(startDateText: string, endDateText: string) {
    if (typeof startDateText !== 'string' || typeof endDateText !== 'string') {
      throw new BadRequestException('活动开始和结束时间必须是有效日期');
    }
    const startDate = new Date(startDateText);
    const endDate = new Date(endDateText);
    this.ensureDateRange(startDate, endDate);
    return { startDate, endDate };
  }

  private ensureDateRange(startDate: Date, endDate: Date) {
    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime())
    ) {
      throw new BadRequestException('活动开始和结束时间必须是有效日期');
    }
    if (endDate < startDate)
      throw new BadRequestException('活动结束时间不能早于开始时间');
  }

  private ensureRewards(rewards: unknown) {
    if (
      rewards !== undefined &&
      rewards !== null &&
      typeof rewards !== 'string'
    ) {
      throw new BadRequestException('奖励摘要必须是文本');
    }
  }
}
