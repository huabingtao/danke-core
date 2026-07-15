import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.menu.findMany({
      orderBy: { sort: 'asc' },
    });
  }
}
