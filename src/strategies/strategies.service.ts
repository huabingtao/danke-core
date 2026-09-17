import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';

export interface StrategyArticleDto {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  badge?: string;
  summary: string;
  readTime?: string;
  views?: string;
  date: string;
  highlights: string[];
  cover?: string;
  url?: string;
  sourceType?: string; // "LOCAL_MARKDOWN" | "REMOTE_HTML_ONLY"
  sourcePath?: string;
  sourceLastModified?: Date;
  channel?: string;
  contentType?: string;
  contentHtml?: string;
  contentMarkdown?: string;
  mediaMapping?: string;
  originalMsgId?: number;
  originalPublishTime?: Date;
  sort?: number;
  enabled?: boolean;
}

@Injectable()
export class StrategiesService {
  private readonly logger = new Logger(StrategiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string) {
    const where: any = { enabled: true };
    if (category && category !== 'all') {
      where.category = category;
    }

    const records = await this.prisma.strategyArticle.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { date: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((item) => ({
      id: item.slug,
      slug: item.slug,
      title: item.title,
      category: item.category,
      categoryLabel: item.categoryLabel,
      badge: item.badge,
      summary: item.summary,
      readTime: item.readTime,
      views: item.views,
      date: item.date,
      highlights: this.safeParse(item.highlights, []),
      cover: item.cover,
      url: item.url,
      sourceType: item.sourceType,
      sourcePath: item.sourcePath,
      sort: item.sort,
    }));
  }

  async findBySlug(slug: string) {
    const item = await this.prisma.strategyArticle.findUnique({
      where: { slug },
    });
    if (!item) return null;

    let contentHtml = item.contentHtml;
    let contentMarkdown = item.contentMarkdown;
    let sourceLastModified = item.sourceLastModified;

    // 若属于本地 Markdown 手稿，执行即时热重载检查 (以本地文件为绝对权威)
    if (item.sourceType === 'LOCAL_MARKDOWN' && item.sourcePath) {
      const workspaceRoot = '/home/guagua/workspace';
      const fullPath = path.isAbsolute(item.sourcePath)
        ? item.sourcePath
        : path.resolve(workspaceRoot, item.sourcePath);

      let actualPath = fullPath;
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        const dirFiles = fs.readdirSync(fullPath);
        const candidates = dirFiles.filter((f) => f.endsWith('.md') && !f.includes('_stage'));
        if (candidates.length > 0) {
          const folderBase = path.basename(fullPath);
          const best =
            candidates.find((f) => f === `${folderBase}.md`) ||
            candidates.find((f) => f === '攻略.md') ||
            candidates.find((f) => f.includes(folderBase)) ||
            candidates[0];
          actualPath = path.join(fullPath, best);
        }
      }

      if (fs.existsSync(actualPath) && !fs.statSync(actualPath).isDirectory()) {
        try {
          const stat = fs.statSync(actualPath);
          const fileMtime = stat.mtime;
          const rawMd = fs.readFileSync(actualPath, 'utf-8');
          contentMarkdown = rawMd;
          sourceLastModified = fileMtime;

          const creatorBase = path.resolve(workspaceRoot, 'project/danke-creator/my-articles-md');
          const articleDir = path.dirname(actualPath);
          const relToCreator = path.relative(creatorBase, articleDir);

          const { html: cleanHtml } = this.parseMarkdownWithCleaning(rawMd, relToCreator);
          contentHtml = cleanHtml;

          // 若文件修改时间有变动或无记录，异步回写缓存
          if (!item.sourceLastModified || fileMtime > item.sourceLastModified) {
            this.logger.log(`⚡ 检测到本地手稿发生修改，即时热重载 [${slug}]: ${actualPath}`);
            this.prisma.strategyArticle
              .update({
                where: { slug },
                data: {
                  contentMarkdown,
                  contentHtml,
                  sourceLastModified: fileMtime,
                },
              })
              .catch((err) => this.logger.warn(`异步更新文章缓存失败: ${err.message}`));
          }
        } catch (err) {
          this.logger.error(`读取本地手稿异常: ${err.message}`);
        }
      }
    } else if (item.sourceType === 'REMOTE_HTML_ONLY' && contentHtml) {
      // 对孤儿历史 HTML 做暗黑战术风净化（消灭刺眼白底与低对比度黑字）
      contentHtml = this.cleanHistoricalHtml(contentHtml);
    }

    return {
      id: item.slug,
      slug: item.slug,
      title: item.title,
      category: item.category,
      categoryLabel: item.categoryLabel,
      badge: item.badge,
      summary: item.summary,
      readTime: item.readTime,
      views: item.views,
      date: item.date,
      highlights: this.safeParse(item.highlights, []),
      cover: item.cover,
      url: item.url,
      sourceType: item.sourceType,
      sourcePath: item.sourcePath,
      sourceLastModified,
      channel: item.channel,
      contentType: item.contentType,
      contentHtml,
      contentMarkdown,
      mediaMapping: this.safeParse(item.mediaMapping, {}),
      sort: item.sort,
      enabled: item.enabled,
    };
  }

  async upsert(dto: StrategyArticleDto) {
    return this.prisma.strategyArticle.upsert({
      where: { slug: dto.slug },
      update: {
        title: dto.title,
        category: dto.category,
        categoryLabel: dto.categoryLabel,
        badge: dto.badge,
        summary: dto.summary,
        readTime: dto.readTime ?? '5 分钟',
        views: dto.views ?? '1.0w',
        date: dto.date,
        highlights:
          typeof dto.highlights === 'string'
            ? dto.highlights
            : JSON.stringify(dto.highlights ?? []),
        cover: dto.cover,
        url: dto.url,
        sourceType: dto.sourceType ?? 'REMOTE_HTML_ONLY',
        sourcePath: dto.sourcePath,
        sourceLastModified: dto.sourceLastModified,
        channel: dto.channel ?? 'WECHAT',
        contentType: dto.contentType ?? 'HTML',
        contentHtml: dto.contentHtml,
        contentMarkdown: dto.contentMarkdown,
        mediaMapping: dto.mediaMapping,
        originalMsgId: dto.originalMsgId,
        originalPublishTime: dto.originalPublishTime,
        sort: dto.sort ?? 0,
        enabled: dto.enabled ?? true,
      },
      create: {
        slug: dto.slug,
        title: dto.title,
        category: dto.category,
        categoryLabel: dto.categoryLabel,
        badge: dto.badge,
        summary: dto.summary,
        readTime: dto.readTime ?? '5 分钟',
        views: dto.views ?? '1.0w',
        date: dto.date,
        highlights:
          typeof dto.highlights === 'string'
            ? dto.highlights
            : JSON.stringify(dto.highlights ?? []),
        cover: dto.cover,
        url: dto.url,
        sourceType: dto.sourceType ?? 'REMOTE_HTML_ONLY',
        sourcePath: dto.sourcePath,
        sourceLastModified: dto.sourceLastModified,
        channel: dto.channel ?? 'WECHAT',
        contentType: dto.contentType ?? 'HTML',
        contentHtml: dto.contentHtml,
        contentMarkdown: dto.contentMarkdown,
        mediaMapping: dto.mediaMapping,
        originalMsgId: dto.originalMsgId,
        originalPublishTime: dto.originalPublishTime,
        sort: dto.sort ?? 0,
        enabled: dto.enabled ?? true,
      },
    });
  }



  /**
   * 一键从 my-articles-md 资源库全量扫描并同步到 danke-core
   */
  async syncFromCreator(customArticlesDir?: string) {
    const articlesDir =
      customArticlesDir ||
      path.resolve(
        process.cwd(),
        '../danke-creator/my-articles-md',
      );

    this.logger.log(`开始从资源库同步文章: ${articlesDir}`);
    if (!fs.existsSync(articlesDir)) {
      throw new Error(`资源库目录不存在: ${articlesDir}`);
    }

    const categoryMap: Record<string, { category: string; label: string }> = {
      活动: { category: 'event', label: '活动精算' },
      爆料: { category: 'event', label: '版本爆料' },
      其他: { category: 'faq', label: '避坑指南' },
      区域行动: { category: 'boss', label: '回响 Boss' },
      装备: { category: 'resources', label: '装备深度' },
      配件: { category: 'resources', label: '配件共鸣' },
      宠物: { category: 'resources', label: '战术宠物' },
      特工: { category: 'faq', label: '特工评测' },
    };

    const synced: any[] = [];
    const rootFolders = fs.readdirSync(articlesDir);

    for (const folder of rootFolders) {
      const folderPath = path.join(articlesDir, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      const mapping = categoryMap[folder] || {
        category: 'event',
        label: folder,
      };

      // 遍历子目录（具体文章篇目，如 "水上乐园大乱斗"）
      const articleDirs = fs.readdirSync(folderPath);
      for (const articleDirName of articleDirs) {
        const articlePath = path.join(folderPath, articleDirName);
        if (!fs.statSync(articlePath).isDirectory()) continue;

        const distJson = path.join(
          articlePath,
          'dist',
          '攻略_stage3_wechat.json',
        );
        const mdFile = path.join(articlePath, '攻略.md');

        let title = articleDirName;
        let summary = `《弹壳特攻队》${articleDirName}全解析`;
        let date = new Date().toISOString().slice(5, 10);
        let highlights: string[] = ['核心机制', '保底精算'];
        let cover: string | undefined = undefined;
        let slug = `${mapping.category}-${encodeURIComponent(articleDirName).toLowerCase().slice(0, 30)}`;

        if (fs.existsSync(distJson)) {
          try {
            const data = JSON.parse(fs.readFileSync(distJson, 'utf-8'));
            if (data.title) title = data.title;
            if (data.summary) summary = data.summary;
            if (data.date) {
              date = data.date.slice(5); // e.g. "09-11"
            }
            if (Array.isArray(data.tags)) {
              highlights = data.tags.filter(
                (t: string) => t !== '弹壳特攻队' && t !== '游戏攻略',
              );
            }
            if (data.cover) {
              // 复制或指向相对路径
              cover = `/assets/articles/${articleDirName}/cover.png`;
            }
          } catch (err) {
            this.logger.warn(`解析 ${distJson} 失败: ${err.message}`);
          }
        } else if (fs.existsSync(mdFile)) {
          try {
            const content = fs.readFileSync(mdFile, 'utf-8');
            const lines = content.split('\n');
            const h1 = lines.find((l) => l.startsWith('# '));
            if (h1) title = h1.replace(/^#\s*/, '').trim();
          } catch (e) {
            // fallback
          }
        } else {
          continue;
        }

        const saved = await this.upsert({
          slug,
          title,
          category: mapping.category,
          categoryLabel: mapping.label,
          badge: articleDirName.includes('大乱斗') ? 'HOT' : undefined,
          summary,
          readTime: '6 分钟',
          views: '1.5w',
          date,
          highlights,
          cover,
          sourcePath: path.relative(process.cwd(), articlePath),
        });

        synced.push({ slug: saved.slug, title: saved.title });
      }
    }

    return {
      success: true,
      count: synced.length,
      articles: synced,
    };
  }

  private safeParse(data: string | null | undefined, fallback: any) {
    if (!data) return fallback;
    try {
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }

  /**
   * 清洗孤儿历史微信 HTML 文章，消除刺眼白底与低对比度黑字，保持战术暗黑统一质感
   */
  private cleanHistoricalHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html
      // 1. 将行内暗黑色字体替换为继承父级高对比度文字
      .replace(
        /color:\s*(?:#1e293b|#444(?:444)?|#333(?:333)?|#222(?:222)?|#111(?:111)?|#000(?:000)?|rgb\(\s*(?:[0-4]?\d|5[0-1])\s*,\s*(?:[0-4]?\d|5[0-1])\s*,\s*(?:[0-4]?\d|5[0-1])\s*\)|black)\s*(?:!important)?;/gi,
        'color: inherit;',
      )
      // 2. 将行内纯白/浅灰背景重置为透明，避免深色页面中出现白色大色块
      .replace(
        /background(?:-color)?:\s*(?:#fff(?:fff)?|#f8fafc|#f2f2f7|#e5e5ea|rgb\(\s*2(?:4[5-9]|5[0-5])\s*,\s*2(?:4[5-9]|5[0-5])\s*,\s*2(?:4[5-9]|5[0-5])\s*\)|white)\s*(?:!important)?;/gi,
        'background-color: transparent;',
      )
      // 3. 规避固定大像素宽度导致横向溢出
      .replace(/width:\s*([6-9]\d{2,}|[1-9]\d{3,})px/gi, 'max-width: 100%')
      // 4. 清除微信残留的无用空标签与占位符
      .replace(/<mp-common-[^>]*>[\s\S]*?<\/mp-common-[^>]*>/gi, '');
  }

  /**
   * 剥离 Frontmatter、清理 img:// 占位符、重写相对图片路径并编译为 HTML
   */
  private parseMarkdownWithCleaning(
    rawMd: string,
    relToCreator: string,
  ): { html: string; cleanMd: string } {
    if (!rawMd) return { html: '', cleanMd: '' };

    // 1. 剥离开头的 YAML Frontmatter (--- ... ---)
    let cleanMd = rawMd.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/, '');

    // 2. 剥离正文中残留的 img:// 占位符、banner 图与自定义语法后缀
    cleanMd = cleanMd
      .replace(/!\[.*?\]\(\s*img:\/\/[^)]+\s*\)(?:\{[^}]*\})?/gi, '')
      .replace(/!\[.*?\]\([^)]+\)\s*\{type=[^}]+\}/gi, '')
      .replace(/\{type=[^}]+\}/gi, '')
      .replace(/^\s*---\s*$/gm, (match, offset) => (offset < 50 ? '' : match)); // 仅剥离文章最开头的孤立分割线

    // 3. 将本地相对图片路径重写为 /uploads/creator/...
    cleanMd = cleanMd.replace(
      /!\[(.*?)\]\(([^)]+)\)/g,
      (match, alt, imgPath) => {
        let p = imgPath.trim();
        if (
          p.startsWith('http://') ||
          p.startsWith('https://') ||
          p.startsWith('/uploads/')
        ) {
          return match;
        }
        if (p.startsWith('./')) p = p.slice(2);
        const normalizedRel = path.join(relToCreator, p).replace(/\\/g, '/');
        return `![${alt}](/uploads/creator/${normalizedRel})`;
      },
    );

    const html = marked.parse(cleanMd.trim()) as string;
    return { html, cleanMd };
  }

  /**
   * 从已缓存的 HTML 中安全剥离泄漏的 frontmatter HTML 节点
   */
  private stripFrontmatterFromHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<hr>\s*<p>title:\s*&quot;[\s\S]*?<\/ul>/i, '');
  }
}
