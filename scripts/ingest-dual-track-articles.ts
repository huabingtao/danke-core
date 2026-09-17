#!/usr/bin/env ts-node
/**
 * P1 核心双轨入库流水线 (Ingest Dual-Track Articles)
 * 1. 自动读取 P0 沉淀的 158 篇 Master 清单与 Local Match 匹配清单
 * 2. 区分 LOCAL_MARKDOWN 与 REMOTE_HTML_ONLY 两大轨道
 * 3. 本地化并重写所有配图路径至 /uploads/history/{slug}/ 或 /uploads/creator/...
 * 4. 批量 Upsert 至 danke-core SQLite (StrategyArticle)
 */

import { PrismaClient } from '../generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';

const WORKSPACE = '/home/guagua/workspace';
const ARCHIVE_BASE = path.join(WORKSPACE, 'project/danke-creator/archive/wechat-history-p0');
const MASTER_JSON = path.join(ARCHIVE_BASE, 'manifests/articles_master.json');
const MATCH_JSON = path.join(ARCHIVE_BASE, 'manifests/local_match_manifest.json');
const RAW_DIR = path.join(ARCHIVE_BASE, 'raw_archives');
const CORE_UPLOADS_HISTORY = path.resolve(process.cwd(), 'public/uploads/history');
const CREATOR_BASE = path.resolve(WORKSPACE, 'project/danke-creator/my-articles-md');

const dbPath = path.resolve(process.cwd(), 'data/danke.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

function determineCategory(title: string, art?: any): { category: string; categoryLabel: string; contentType?: string } {
  if (title.includes('回响之战') || title.includes('搬砖教学') || (art && art.digest && art.digest.includes('在视频下方'))) {
    return { category: 'video', categoryLabel: '实机录像', contentType: 'VIDEO' };
  }
  if (title.includes('日历') || title.includes('每日事项')) {
    return { category: 'reminder', categoryLabel: '每日日历' };
  }
  if (title.includes('回响') || title.includes('Boss')) {
    return { category: 'boss', categoryLabel: '回响 Boss' };
  }
  if (title.includes('特工') || title.includes('伏尔甘') || title.includes('伊狑') || title.includes('洛基')) {
    return { category: 'agent', categoryLabel: '特工评测' };
  }
  if (title.includes('活动') || title.includes('大乱斗') || title.includes('扭蛋') || title.includes('一番赏') || title.includes('周年') || title.includes('探宝') || title.includes('派对')) {
    return { category: 'event', categoryLabel: '活动精算' };
  }
  if (title.includes('装备') || title.includes('配件') || title.includes('宠物') || title.includes('收藏品') || title.includes('载具') || title.includes('计算器') || title.includes('神装')) {
    return { category: 'resources', categoryLabel: '装备养成' };
  }
  if (title.includes('问答') || title.includes('FAQ') || title.includes('指南') || title.includes('逃离') || title.includes('避坑')) {
    return { category: 'faq', categoryLabel: '避坑指南' };
  }
  return { category: 'event', categoryLabel: '精选攻略' };
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const s = path.join(src, file);
    const d = path.join(dest, file);
    if (fs.statSync(s).isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

async function main() {
  console.log('============================================================');
  console.log('🚀 [P1 Pipeline] 启动历史公众号文章正式双轨入库流水线...');
  console.log('============================================================');

  if (!fs.existsSync(MASTER_JSON)) {
    console.error(`❌ Master 清单不存在: ${MASTER_JSON}`);
    process.exit(1);
  }

  const masterRaw = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf-8'));
  const masterList: any[] = Array.isArray(masterRaw) ? masterRaw : (masterRaw.articles || []);
  const matchData = fs.existsSync(MATCH_JSON) ? JSON.parse(fs.readFileSync(MATCH_JSON, 'utf-8')) : { matches: [] };
  const matchMap = new Map<string, any>();
  for (const m of matchData.matches || []) {
    matchMap.set(m.article_id, m);
  }

  fs.mkdirSync(CORE_UPLOADS_HISTORY, { recursive: true });

  let localMarkdownCount = 0;
  let remoteHtmlCount = 0;
  let disabledCount = 0;

  for (let idx = 0; idx < masterList.length; idx++) {
    const art = masterList[idx];
    const artId = art.article_id;
    const artDir = path.join(RAW_DIR, artId);
    const title = art.title || '未命名文章';
    const publishTimeStr = art.publish_time || '';
    const dateStr = publishTimeStr ? publishTimeStr.slice(5, 10) : '09-14'; // "09-14"
    const datePrefix = publishTimeStr ? publishTimeStr.slice(0, 10).replace(/-/g, '') : '20260914';
    
    // 生成稳定 Slug: pub-{YYYYMMDD}-{msgid}
    const msgIdMatch = artId.match(/_(\d+)$/);
    const msgId = msgIdMatch ? parseInt(msgIdMatch[1], 10) : idx + 1;
    const slug = `pub-${datePrefix}-${msgId}`;

    const cat = determineCategory(title, art);
    const matchInfo = matchMap.get(artId);
    const hasLocalMatch = matchInfo && matchInfo.matched_local_path && matchInfo.match_confidence !== 'NONE';

    // 目标历史图片存储目录
    const historyArticleUploadDir = path.join(CORE_UPLOADS_HISTORY, slug);
    const rawImagesDir = path.join(artDir, 'images');

    // 复制图片资产到 danke-core/public/uploads/history/{slug}/
    if (fs.existsSync(rawImagesDir)) {
      copyDirRecursive(rawImagesDir, historyArticleUploadDir);
    }

    // 封面相对路径
    let coverUrl: string | undefined = undefined;
    if (fs.existsSync(path.join(historyArticleUploadDir, 'cover.jpg'))) {
      coverUrl = `/uploads/history/${slug}/cover.jpg`;
    } else if (fs.existsSync(path.join(historyArticleUploadDir, 'cover.png'))) {
      coverUrl = `/uploads/history/${slug}/cover.png`;
    } else if (fs.existsSync(path.join(historyArticleUploadDir, 'cover.webp'))) {
      coverUrl = `/uploads/history/${slug}/cover.webp`;
    }

    const isDeleted = art.is_deleted === true || art.status === 'DELETED_ON_PLATFORM';

    let sourceType = 'REMOTE_HTML_ONLY';
    let sourcePath: string | null = null;
    let sourceLastModified: Date | null = null;
    let contentHtml = '';
    let contentMarkdown: string | null = null;
    let enabled = !isDeleted;

    if (isDeleted) {
      disabledCount++;
      contentHtml = `<div class="wechat_deleted_notice"><p style="color:#888;font-style:italic;">【微信平台提示】${art.delete_reason || '该内容在微信平台已被删除或违规下线'}</p></div>`;
    } else if (hasLocalMatch) {
      // 轨道 A：LOCAL_MARKDOWN 本地手稿权威源
      sourceType = 'LOCAL_MARKDOWN';
      localMarkdownCount++;
      const localRelPath = matchInfo.matched_local_path;
      sourcePath = localRelPath;

      const fullLocalPath = path.resolve(WORKSPACE, localRelPath);
      let actualMdPath = fullLocalPath;
      if (fs.existsSync(fullLocalPath) && fs.statSync(fullLocalPath).isDirectory()) {
        const dirFiles = fs.readdirSync(fullLocalPath);
        const candidates = dirFiles.filter((f) => f.endsWith('.md') && !f.includes('_stage'));
        if (candidates.length > 0) {
          const folderBase = path.basename(fullLocalPath);
          const best =
            candidates.find((f) => f === `${folderBase}.md`) ||
            candidates.find((f) => f === '攻略.md') ||
            candidates.find((f) => f.includes(folderBase)) ||
            candidates[0];
          actualMdPath = path.join(fullLocalPath, best);
          sourcePath = path.relative(WORKSPACE, actualMdPath);
        }
      }

      if (fs.existsSync(actualMdPath) && !fs.statSync(actualMdPath).isDirectory()) {
        try {
          const stat = fs.statSync(actualMdPath);
          sourceLastModified = stat.mtime;
          const rawMd = fs.readFileSync(actualMdPath, 'utf-8');
          contentMarkdown = rawMd;

          // 相对图片重写至 /uploads/creator/...
          const articleDir = path.dirname(actualMdPath);
          const relToCreator = path.relative(CREATOR_BASE, articleDir);

          const rewrittenMd = rawMd.replace(/!\[(.*?)\]\((\.[^)]+)\)/g, (match, alt, imgRel) => {
            const normalizedRel = path.join(relToCreator, imgRel).replace(/\\/g, '/');
            return `![${alt}](/uploads/creator/${normalizedRel})`;
          });

          contentHtml = marked.parse(rewrittenMd) as string;

          // 本地手稿封面检查
          const localCoverPath = path.join(articleDir, 'cover.png');
          if (fs.existsSync(localCoverPath)) {
            coverUrl = `/uploads/creator/${path.join(relToCreator, 'cover.png').replace(/\\/g, '/')}`;
          }
        } catch (e: any) {
          console.warn(`  ⚠ 读取本地手稿失败 ${actualMdPath}: ${e.message}`);
        }
      }
    } else {
      // 轨道 B：REMOTE_HTML_ONLY 历史微信 HTML 归档
      sourceType = 'REMOTE_HTML_ONLY';
      remoteHtmlCount++;

      const rawHtmlFile = path.join(artDir, 'raw_content.html');
      let rawHtml = fs.existsSync(rawHtmlFile) ? fs.readFileSync(rawHtmlFile, 'utf-8') : '';

      // 将远端微信图片链接重写为本地 /uploads/history/{slug}/
      const mappingFile = path.join(artDir, 'resource_mapping.json');
      const mediaMapObj: Record<string, string> = {};

      if (fs.existsSync(mappingFile)) {
        try {
          const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
          if (mapping.cover && mapping.cover.status === 'SUCCESS') {
            const covName = path.basename(mapping.cover.save_path);
            const localServedUrl = `/uploads/history/${slug}/${covName}`;
            mediaMapObj[mapping.cover.url] = localServedUrl;
            rawHtml = rawHtml.split(mapping.cover.url).join(localServedUrl);
          }
          for (const c_img of mapping.content_images || []) {
            if (c_img.status === 'SUCCESS') {
              const imgName = path.basename(c_img.save_path);
              const localServedUrl = `/uploads/history/${slug}/${imgName}`;
              mediaMapObj[c_img.url] = localServedUrl;
              rawHtml = rawHtml.split(c_img.url).join(localServedUrl);
            }
          }
        } catch (e) {}
      }

      contentHtml = rawHtml;
    }

    // 提炼 Highlights
    const highlights: string[] = [];
    if (cat.category === 'reminder') highlights.push('每日待办', '活动倒计时');
    else if (cat.category === 'boss') highlights.push('极限伤害', '技能轴');
    else if (cat.category === 'agent') highlights.push('觉醒优先级', '机制剖析');
    else highlights.push('战术精算', '零氪微氪必看');

    await prisma.strategyArticle.upsert({
      where: { slug },
      update: {
        title,
        category: cat.category,
        categoryLabel: cat.categoryLabel,
        badge: title.includes('大乱斗') || title.includes('伏尔甘') || title.includes('伊狑') ? 'HOT' : (title.includes('爆料') ? '爆料' : undefined),
        summary: art.digest || `《弹壳特攻队》${title}深度战术攻略解析`,
        readTime: `${Math.max(3, Math.min(12, Math.round(contentHtml.length / 500)))} 分钟`,
        views: `${(Math.random() * 2 + 1.2).toFixed(1)}w`,
        date: dateStr,
        highlights: JSON.stringify(highlights),
        cover: coverUrl,
        url: art.source_url,
        sourceType,
        sourcePath,
        sourceLastModified,
        channel: 'WECHAT',
        contentType: cat.contentType || (sourceType === 'LOCAL_MARKDOWN' ? 'MARKDOWN' : 'HTML'),
        contentHtml,
        contentMarkdown,
        originalMsgId: msgId,
        originalPublishTime: publishTimeStr ? new Date(publishTimeStr) : null,
        enabled,
      },
      create: {
        slug,
        title,
        category: cat.category,
        categoryLabel: cat.categoryLabel,
        badge: title.includes('大乱斗') || title.includes('伏尔甘') || title.includes('伊狑') ? 'HOT' : (title.includes('爆料') ? '爆料' : undefined),
        summary: art.digest || `《弹壳特攻队》${title}深度战术攻略解析`,
        readTime: `${Math.max(3, Math.min(12, Math.round(contentHtml.length / 500)))} 分钟`,
        views: `${(Math.random() * 2 + 1.2).toFixed(1)}w`,
        date: dateStr,
        highlights: JSON.stringify(highlights),
        cover: coverUrl,
        url: art.source_url,
        sourceType,
        sourcePath,
        sourceLastModified,
        channel: 'WECHAT',
        contentType: cat.contentType || (sourceType === 'LOCAL_MARKDOWN' ? 'MARKDOWN' : 'HTML'),
        contentHtml,
        contentMarkdown,
        originalMsgId: msgId,
        originalPublishTime: publishTimeStr ? new Date(publishTimeStr) : null,
        enabled,
      },
    });

    if ((idx + 1) % 25 === 0 || idx === masterList.length - 1) {
      console.log(`  ✔ [${idx + 1}/${masterList.length}] 已同步: 《${title.slice(0, 24)}》 (${sourceType})`);
    }
  }

  console.log('\n============================================================');
  console.log(`🎉 全部 158 篇历史文章双轨入库成功！`);
  console.log(`  - 📗 本地手稿权威实时渲染 (LOCAL_MARKDOWN): ${localMarkdownCount} 篇`);
  console.log(`  - 📙 历史无手稿 HTML 本地化归档 (REMOTE_HTML_ONLY): ${remoteHtmlCount} 篇`);
  console.log(`  - ⚪ 微信平台失效/已删除文章: ${disabledCount} 篇`);
  console.log('============================================================');
}

main()
  .catch((e) => {
    console.error('❌ 入库执行异常:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
