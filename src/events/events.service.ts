import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto) {
    return this.prisma.gameEvent.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        rewards: dto.rewards,
      },
    });
  }

  async findAll() {
    return this.prisma.gameEvent.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.gameEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`ID 为 "${id}" 的游戏活动未找到`);
    }

    return event;
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    return this.prisma.gameEvent.delete({
      where: { id },
    });
  }
}
