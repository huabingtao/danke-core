import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WikiEntryQuery {
  category?: string;
  subcategory?: string;
  edition?: string;
  tag?: string;
  q?: string;
}

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  async findEntries(query: WikiEntryQuery = {}) {
    const where: Record<string, any> = { enabled: true };
    if (query.category && query.category !== 'ALL') {
      where.category = query.category.toUpperCase();
    }
    if (query.subcategory) {
      where.subcategory = query.subcategory;
    }
    if (query.edition) {
      where.edition = query.edition;
    }

    const records = await this.prisma.wikiEntry.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { updatedAt: 'desc' }],
    });

    const parsed = records.map((item) => this.formatEntry(item));

    return parsed.filter((item) => {
      if (query.tag && !item.tags.some((t: string) => t.includes(query.tag!))) {
        return false;
      }
      if (query.q) {
        const kw = query.q.trim().toLowerCase();
        const inName = item.name.toLowerCase().includes(kw);
        const inSummary = item.summary.toLowerCase().includes(kw);
        const inTags = item.tags.some((t: string) => t.toLowerCase().includes(kw));
        const inSub = (item.subcategory || '').toLowerCase().includes(kw);
        return inName || inSummary || inTags || inSub;
      }
      return true;
    });
  }

  async findEntryBySlug(slug: string) {
    const record = await this.prisma.wikiEntry.findUnique({
      where: { slug },
    });
    if (!record) return null;

    const formatted = this.formatEntry(record);
    let relatedArticles: any[] = [];
    if (formatted.relatedArticleSlugs.length > 0) {
      relatedArticles = await this.prisma.strategyArticle.findMany({
        where: {
          slug: { in: formatted.relatedArticleSlugs },
          enabled: true,
        },
        select: {
          slug: true,
          title: true,
          category: true,
          categoryLabel: true,
          summary: true,
          date: true,
          badge: true,
        },
      });
    }

    return {
      ...formatted,
      relatedArticles,
    };
  }

  async findMatrices(category?: string) {
    const where: Record<string, any> = { enabled: true };
    if (category && category !== 'ALL') {
      where.category = category.toUpperCase();
    }
    const records = await this.prisma.progressionMatrix.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { updatedAt: 'desc' }],
    });
    return records.map((m) => this.formatMatrix(m));
  }

  async findMatrixByCode(code: string) {
    const record = await this.prisma.progressionMatrix.findUnique({
      where: { code },
    });
    if (!record) return null;
    return this.formatMatrix(record);
  }

  private formatEntry(item: any) {
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      edition: item.edition,
      rarity: item.rarity,
      tier: item.tier,
      icon: item.icon,
      summary: item.summary,
      tags: this.safeParse(item.tags, []),
      attributes: this.safeParse(item.attributes, {}),
      relatedArticleSlugs: this.safeParse(item.relatedArticleSlugs, []),
      sort: item.sort,
    };
  }

  private formatMatrix(item: any) {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      category: item.category,
      summary: item.summary,
      columns: this.safeParse(item.columns, []),
      rows: this.safeParse(item.rows, []),
      recommendations: this.safeParse(item.recommendations, []),
      relatedArticleSlug: item.relatedArticleSlug,
      sort: item.sort,
    };
  }

  private safeParse(raw: string, fallback: any) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
}
