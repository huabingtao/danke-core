import { PrismaClient } from '../generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const rawUrl = process.env.DATABASE_URL || 'file:./data/danke.db';
const relativePath = rawUrl.replace(/^file:/, '');
const absolutePath = path.resolve(process.cwd(), relativePath);

const sqliteDb = new Database(absolutePath);
sqliteDb.pragma('journal_mode = WAL');

const adapter = new PrismaBetterSqlite3({ url: absolutePath });
const prisma = new PrismaClient({ adapter });

// 1. 内置 6 位特工图鉴完整数据
const INITIAL_AGENTS = [
  {
    code: 'VITOR',
    name: '维托尔',
    subtitle: '神火狂啸 · 爆发核心',
    tier: 'SS级特工',
    rating: '99% 胜率推荐',
    role: '极速清屏 / 爆发输出',
    mainSkill: '魔导爆破：发射穿透性高能魔弹并在敌群中引发连锁爆炸',
    perks: ['魔能轰炸', '肾上腺素', '暴伤加成 +40%'],
    colorScheme: {
      bg: 'from-orange-950/70 via-zinc-900/90 to-zinc-950',
      border: 'border-orange-500/30 hover:border-orange-500/80',
      badgeBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
      badgeText: 'text-zinc-950',
      glow: 'glow-orange',
      textGradient: 'from-orange-400 to-amber-300',
      energyColor: 'rgba(249, 115, 22, 0.45)',
    },
    image: '/assets/agent-vitor.png',
    sort: 1,
  },
  {
    code: 'RINNE',
    name: '凛音',
    subtitle: '樱落绝影 · 范围制霸',
    tier: 'S级特工',
    rating: '95% 控场优选',
    role: '范围斩击 / 风暴制霸',
    mainSkill: '樱落千刃：召唤樱花风暴与刀芒切碎大批敌群',
    perks: ['樱落斩', '樱花风暴', '范围加成 +30%'],
    colorScheme: {
      bg: 'from-pink-950/70 via-zinc-900/90 to-zinc-950',
      border: 'border-pink-500/30 hover:border-pink-500/80',
      badgeBg: 'bg-gradient-to-r from-pink-500 to-purple-500',
      badgeText: 'text-zinc-950',
      glow: 'glow-purple',
      textGradient: 'from-pink-400 to-purple-300',
      energyColor: 'rgba(236, 72, 153, 0.45)',
    },
    image: '/assets/agent-rinne.png',
    sort: 2,
  },
  {
    code: 'NEZHA',
    name: '哪吒',
    subtitle: '三昧真火 · 持续灼烧',
    tier: 'S级特工',
    rating: '持续输出利器',
    role: '真火穿透 / 持续灼烧',
    mainSkill: '乾坤火尖枪：投掷混天绫与三昧烈焰封锁战场',
    perks: ['三昧真火', '混天绫', '灼烧伤害 +35%'],
    colorScheme: {
      bg: 'from-red-950/70 via-zinc-900/90 to-zinc-950',
      border: 'border-red-500/30 hover:border-red-500/80',
      badgeBg: 'bg-gradient-to-r from-red-500 to-orange-500',
      badgeText: 'text-zinc-950',
      glow: 'glow-orange',
      textGradient: 'from-red-400 to-orange-300',
      energyColor: 'rgba(239, 68, 68, 0.45)',
    },
    image: '/assets/agent-nezha.png',
    sort: 3,
  },
  {
    code: 'VULCAN',
    name: '伏尔甘',
    subtitle: '重装工匠 · 机械压制',
    tier: 'S级特工',
    rating: '防守反击核心',
    role: '重装防御 / 机械炮塔',
    mainSkill: '火神巨炮：部署超重型连发防御炮台进行大范围压制',
    perks: ['火神巨炮', '重装工匠', '护盾防御 +25%'],
    colorScheme: {
      bg: 'from-amber-950/70 via-zinc-900/90 to-zinc-950',
      border: 'border-amber-500/30 hover:border-amber-500/80',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
      badgeText: 'text-zinc-950',
      glow: 'glow-orange',
      textGradient: 'from-amber-400 to-yellow-300',
      energyColor: 'rgba(245, 158, 11, 0.45)',
    },
    image: '/assets/agent-vulcan.png',
    sort: 4,
  },
  {
    code: 'TALOSHIA',
    name: '塔洛西娅',
    subtitle: '暗夜影刃 · 裂伤暴击',
    tier: 'S级特工',
    rating: '暗夜暴击收割',
    role: '暗夜潜行 / 裂伤暴击',
    mainSkill: '幽影幻舞：进入隐身状态并造成高频高额裂伤暴击',
    perks: ['幽影之刃', '暗影裂伤', '裂伤伤害 +45%'],
    colorScheme: {
      bg: 'from-emerald-950/70 via-zinc-900/90 to-zinc-950',
      border: 'border-emerald-500/30 hover:border-emerald-500/80',
      badgeBg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      badgeText: 'text-zinc-950',
      glow: 'glow-blue',
      textGradient: 'from-emerald-400 to-teal-300',
      energyColor: 'rgba(16, 185, 129, 0.45)',
    },
    image: '/assets/agent-taloshia.png',
    sort: 5,
  },
  {
    code: 'COMMON',
    name: '科萌',
    subtitle: '初诞特工 · 万金油过渡',
    tier: '普通特工',
    rating: '萌新开荒首选',
    role: '初诞均衡 / 新手开荒',
    mainSkill: '能量集束：发射平衡稳定的能量射击弹道',
    perks: ['能量弹', '均衡射击', '基础生命 +20%'],
    colorScheme: {
      bg: 'from-blue-950/70 via-zinc-900/90 to-zinc-950',
      border: 'border-blue-500/30 hover:border-blue-500/80',
      badgeBg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      badgeText: 'text-zinc-950',
      glow: 'glow-blue',
      textGradient: 'from-blue-400 to-cyan-300',
      energyColor: 'rgba(59, 130, 246, 0.45)',
    },
    image: '/assets/agent-common.png',
    sort: 6,
  },
];

// 2. 内置 4 篇精选攻略
const INITIAL_STRATEGIES = [
  {
    slug: 's1',
    title: '【4周年庆】一番赏/彩虹骰阶梯消耗精算与低成本拿保底策略',
    category: 'event',
    categoryLabel: '活动精算',
    badge: 'HOT',
    summary: '详细解析 4 周年庆一番赏每日免费抽奖上限、彩虹矿石兑换优先级与微氪党/零氪党最佳止损节点。',
    readTime: '6 分钟',
    views: '1.8w',
    date: '09-06',
    highlights: ['免费资源拉满', '彩虹骰保底', 'SS核心顺位'],
    sort: 1,
  },
  {
    slug: 's2',
    title: '【回响之战】狂暴机械主脑 & 毒雾暴君 极限刷分走位与技能搭配',
    category: 'boss',
    categoryLabel: '回响 Boss',
    badge: '必备',
    summary: '针对本周回响之战两个高难度 Boss 的弹幕死角、开局前 60 秒技能抓取优先级及特工无伤卡位教学。',
    readTime: '5 分钟',
    views: '1.2w',
    date: '09-05',
    highlights: ['无人机+足球', '贴脸输出时隙', '伤害放大技巧'],
    sort: 2,
  },
  {
    slug: 's3',
    title: '【资源全景】日常体力/金币/图纸/钻石全渠道高效收割路线图',
    category: 'resources',
    categoryLabel: '资源速刷',
    badge: undefined,
    summary: '盘点每日 30 分钟日常速刷顺序、公会商店兑换权重、巡逻收益卡点与章节金币最大化关卡推荐。',
    readTime: '8 分钟',
    views: '9.5k',
    date: '09-04',
    highlights: ['第4章金币法', '巡逻快速收益', '每周公会币'],
    sort: 3,
  },
  {
    slug: 's4',
    title: '【高频避坑 FAQ】神铸进阶/配件共鸣/宠物洗练新手必须知道的 10 件事',
    category: 'faq',
    categoryLabel: '避坑指南',
    badge: undefined,
    summary: '解答“红武升神铸先升哪件”、“红色配件先共鸣哪个”、“异宠核心如何分配”等玩家最常踩坑的十个问题。',
    readTime: '7 分钟',
    views: '1.4w',
    date: '09-03',
    highlights: ['神铸优先级', '配件共鸣坑', '宠物洗练洗法'],
    sort: 4,
  },
];

async function main() {
  console.log('🚀 开始将 danke-web 静态资源与 creator 文章同步到 danke-core 数据库...');

  // 1. 同步特工数据
  console.log('\n📦 正在同步特工图鉴数据...');
  for (const ag of INITIAL_AGENTS) {
    await prisma.agent.upsert({
      where: { code: ag.code },
      update: {
        name: ag.name,
        subtitle: ag.subtitle,
        tier: ag.tier,
        rating: ag.rating,
        role: ag.role,
        mainSkill: ag.mainSkill,
        perks: JSON.stringify(ag.perks),
        colorScheme: JSON.stringify(ag.colorScheme),
        image: ag.image,
        sort: ag.sort,
        enabled: true,
      },
      create: {
        code: ag.code,
        name: ag.name,
        subtitle: ag.subtitle,
        tier: ag.tier,
        rating: ag.rating,
        role: ag.role,
        mainSkill: ag.mainSkill,
        perks: JSON.stringify(ag.perks),
        colorScheme: JSON.stringify(ag.colorScheme),
        image: ag.image,
        sort: ag.sort,
        enabled: true,
      },
    });
    console.log(`  ✔ 特工已入库: [${ag.code}] ${ag.name}`);
  }

  // 2. 同步初始精选攻略
  console.log('\n📄 正在同步精选攻略数据...');
  for (const st of INITIAL_STRATEGIES) {
    await prisma.strategyArticle.upsert({
      where: { slug: st.slug },
      update: {
        title: st.title,
        category: st.category,
        categoryLabel: st.categoryLabel,
        badge: st.badge,
        summary: st.summary,
        readTime: st.readTime,
        views: st.views,
        date: st.date,
        highlights: JSON.stringify(st.highlights),
        sort: st.sort,
        enabled: true,
      },
      create: {
        slug: st.slug,
        title: st.title,
        category: st.category,
        categoryLabel: st.categoryLabel,
        badge: st.badge,
        summary: st.summary,
        readTime: st.readTime,
        views: st.views,
        date: st.date,
        highlights: JSON.stringify(st.highlights),
        sort: st.sort,
        enabled: true,
      },
    });
    console.log(`  ✔ 攻略已入库: [${st.slug}] ${st.title.slice(0, 24)}...`);
  }

  // 3. 扫描 my-articles-md 资源库，自动增量同步真实文章
  const creatorArticlesPath = path.resolve(
    __dirname,
    '../../danke-creator/my-articles-md',
  );

  if (fs.existsSync(creatorArticlesPath)) {
    console.log(`\n🔍 正在扫描 creator 资源库: ${creatorArticlesPath}...`);
    const categoryMap: Record<string, { category: string; label: string }> = {
      活动: { category: 'event', label: '活动精算' },
      爆料: { category: 'event', label: '版本爆料' },
      其他: { category: 'faq', label: '避坑指南' },
      区域行动: { category: 'boss', label: '回响 Boss' },
      装备: { category: 'resources', label: '装备深度' },
      配件: { category: 'resources', label: '配件共鸣' },
      宠物: { category: 'resources', label: '战术宠物' },
    };

    const folders = fs.readdirSync(creatorArticlesPath);
    let syncedCount = 0;

    for (const folder of folders) {
      const folderPath = path.join(creatorArticlesPath, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      const mapping = categoryMap[folder] || {
        category: 'event',
        label: folder,
      };

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
        let date = '09-11';
        let highlights: string[] = ['核心机制', '保底精算'];
        const slug = `${mapping.category}-${encodeURIComponent(articleDirName).toLowerCase().slice(0, 30)}`;

        if (fs.existsSync(distJson)) {
          try {
            const data = JSON.parse(fs.readFileSync(distJson, 'utf-8'));
            if (data.title) title = data.title;
            if (data.summary) summary = data.summary;
            if (data.date) date = data.date.slice(5);
            if (Array.isArray(data.tags)) {
              highlights = data.tags.filter(
                (t: string) => t !== '弹壳特攻队' && t !== '游戏攻略',
              );
            }
          } catch (e) {
            // ignore
          }
        } else if (fs.existsSync(mdFile)) {
          try {
            const content = fs.readFileSync(mdFile, 'utf-8');
            const lines = content.split('\n');
            const h1 = lines.find((l) => l.startsWith('# '));
            if (h1) title = h1.replace(/^#\s*/, '').trim();
          } catch (e) {
            // ignore
          }
        } else {
          continue;
        }

        await prisma.strategyArticle.upsert({
          where: { slug },
          update: {
            title,
            category: mapping.category,
            categoryLabel: mapping.label,
            badge: articleDirName.includes('大乱斗') ? '最新' : undefined,
            summary,
            readTime: '6 分钟',
            views: '1.2w',
            date,
            highlights: JSON.stringify(highlights),
            sourcePath: path.relative(process.cwd(), articlePath),
            enabled: true,
          },
          create: {
            slug,
            title,
            category: mapping.category,
            categoryLabel: mapping.label,
            badge: articleDirName.includes('大乱斗') ? '最新' : undefined,
            summary,
            readTime: '6 分钟',
            views: '1.2w',
            date,
            highlights: JSON.stringify(highlights),
            sourcePath: path.relative(process.cwd(), articlePath),
            enabled: true,
          },
        });
        console.log(`  🌟 成功同步资源库文章: [${folder}] ${title}`);
        syncedCount++;
      }
    }
    console.log(`\n🎉 资源库扫描完成，共同步 ${syncedCount} 篇真实文章到 danke-core！`);
  }

  console.log('\n✨ 所有数据初始化与同步全部完成！');
}

main()
  .catch((e) => {
    console.error('❌ 同步过程中出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    sqliteDb.close();
  });
