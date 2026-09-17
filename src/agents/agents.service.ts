import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentDto {
  code: string;
  name: string;
  subtitle: string;
  tier: string;
  rating: string;
  role: string;
  mainSkill: string;
  perks: string[];
  colorScheme: Record<string, any>;
  image: string;
  sort?: number;
  enabled?: boolean;
}

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const records = await this.prisma.agent.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((item) => ({
      id: item.code.toLowerCase(),
      code: item.code,
      name: item.name,
      subtitle: item.subtitle,
      tier: item.tier,
      rating: item.rating,
      role: item.role,
      mainSkill: item.mainSkill,
      perks: this.safeParse(item.perks, []),
      colorScheme: this.safeParse(item.colorScheme, {}),
      image: item.image,
      sort: item.sort,
    }));
  }

  async findByCode(code: string) {
    const item = await this.prisma.agent.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!item) return null;

    return {
      id: item.code.toLowerCase(),
      code: item.code,
      name: item.name,
      subtitle: item.subtitle,
      tier: item.tier,
      rating: item.rating,
      role: item.role,
      mainSkill: item.mainSkill,
      perks: this.safeParse(item.perks, []),
      colorScheme: this.safeParse(item.colorScheme, {}),
      image: item.image,
      sort: item.sort,
    };
  }

  async upsert(dto: AgentDto) {
    const code = dto.code.toUpperCase();
    return this.prisma.agent.upsert({
      where: { code },
      update: {
        name: dto.name,
        subtitle: dto.subtitle,
        tier: dto.tier,
        rating: dto.rating,
        role: dto.role,
        mainSkill: dto.mainSkill,
        perks: typeof dto.perks === 'string' ? dto.perks : JSON.stringify(dto.perks),
        colorScheme:
          typeof dto.colorScheme === 'string'
            ? dto.colorScheme
            : JSON.stringify(dto.colorScheme),
        image: dto.image,
        sort: dto.sort ?? 0,
        enabled: dto.enabled ?? true,
      },
      create: {
        code,
        name: dto.name,
        subtitle: dto.subtitle,
        tier: dto.tier,
        rating: dto.rating,
        role: dto.role,
        mainSkill: dto.mainSkill,
        perks: typeof dto.perks === 'string' ? dto.perks : JSON.stringify(dto.perks),
        colorScheme:
          typeof dto.colorScheme === 'string'
            ? dto.colorScheme
            : JSON.stringify(dto.colorScheme),
        image: dto.image,
        sort: dto.sort ?? 0,
        enabled: dto.enabled ?? true,
      },
    });
  }

  private safeParse(data: string, fallback: any) {
    try {
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }
}
