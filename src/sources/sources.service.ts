import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSourceDto) {
    const existing = await this.prisma.source.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`名称为 "${dto.name}" 的产出途径已存在`);
    }

    return this.prisma.source.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const source = await this.prisma.source.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundException(`ID 为 "${id}" 的产出途径未找到`);
    }

    return source;
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    return this.prisma.source.delete({
      where: { id },
    });
  }
}
