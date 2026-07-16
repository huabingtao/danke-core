import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`名称为 "${dto.name}" 的菜单已存在`);
    }

    return this.prisma.menu.create({
      data: {
        name: dto.name,
        path: dto.path ?? null,
        sort: dto.sort ?? 0,
        parentId: dto.parentId ?? null,
        permissionCode: dto.permissionCode ?? null,
      },
    });
  }

  async findAll() {
    return this.prisma.menu.findMany({
      orderBy: { sort: 'asc' },
    });
  }

  async findOne(id: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!menu) {
      throw new NotFoundException(`ID 为 "${id}" 的菜单未找到`);
    }

    return menu;
  }

  async update(id: string, dto: UpdateMenuDto) {
    const menu = await this.findOne(id);

    if (dto.name && dto.name !== menu.name) {
      const existing = await this.prisma.menu.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`名称为 "${dto.name}" 的菜单已存在`);
      }
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        name: dto.name,
        path: dto.path,
        sort: dto.sort,
        parentId: dto.parentId,
        permissionCode: dto.permissionCode,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.menu.delete({
      where: { id },
    });
  }
}
