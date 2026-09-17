import { PrismaClient } from '../generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const rawUrl = process.env.DATABASE_URL || 'file:./data/danke.db';
const relativePath = rawUrl.replace(/^file:/, '');
const absolutePath = path.resolve(process.cwd(), relativePath);

const sqliteDb = new Database(absolutePath);
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('synchronous = NORMAL');
sqliteDb.close();

const adapter = new PrismaBetterSqlite3({ url: absolutePath });
const prisma = new PrismaClient({ adapter });

// 20 项资源定义
const itemsConfig = [
  { name: 's杰出装备', type: 'EQUIPMENT', description: '4.9版本S级杰出装备' },
  { name: '史诗配件', type: 'TECH_PART', description: '史诗品质科技配件' },
  { name: '杰出配件', type: 'TECH_PART', description: '杰出品质科技配件' },
  { name: '史诗宠物', type: 'CONSUMABLE', description: '史诗品质宠物资源' },
  { name: '杰出宠物', type: 'CONSUMABLE', description: '杰出品质宠物资源' },
  { name: '觉醒水晶', type: 'CURRENCY', description: '特工觉醒核心水晶' },
  { name: 'sp特工万能碎片', type: 'CONSUMABLE', description: 'SP特工通用碎片' },
  { name: 's特工碎片', type: 'CONSUMABLE', description: 'S级特工专属碎片' },
  { name: '传奇载具碎片', type: 'CONSUMABLE', description: '传奇品质载具配件碎片' },
  { name: '史诗收藏品', type: 'EQUIPMENT', description: '史诗品质局内收藏品' },
  { name: '杰出收藏品', type: 'EQUIPMENT', description: '杰出品质局内收藏品' },
  { name: '高级收藏之心', type: 'CURRENCY', description: '高级收藏品升级之心' },
  { name: '传奇收藏品', type: 'EQUIPMENT', description: '传奇品质局内收藏品' },
  { name: '载具零件钥匙', type: 'KEY', description: '载具零件抽取专属钥匙' },
  { name: '其他钥匙', type: 'KEY', description: '包含军备/宝箱/宠物等各类综合钥匙' },
  { name: '神器核心', type: 'CURRENCY', description: '创世神器重铸核心' },
  { name: '异宠核心', type: 'CURRENCY', description: '异宠合成进化核心' },
  { name: '谐振芯片', type: 'CURRENCY', description: '科技配件专属谐振芯片' },
  { name: '特工核心', type: 'CURRENCY', description: '特工突破重铸核心' },
  { name: '自选核心', type: 'CURRENCY', description: '全核心自选宝箱/核心' },
];

// 27 个途径定义
const sourcesConfig = [
  { name: '工会远征第一阶段难度12以上', category: '工会远征', type: 'EVENT' },
  { name: '工会远征第二阶段', category: '工会远征', type: 'EVENT' },
  { name: '工会商店兑换', category: '工会系统', type: 'WEEKLY' },
  { name: '工会远征排行榜', category: '工会远征', type: 'EVENT', description: '取5核心碎片为平均值' },
  { name: '工会探索', category: '工会系统', type: 'WEEKLY' },
  { name: '通用兑换', category: '常规兑换', type: 'MONTHLY' },
  { name: '日常挑战', category: '日常挑战', type: 'DAILY' },
  { name: '回响日常部分', category: '回响之战', type: 'DAILY' },
  { name: '回响结算部分', category: '回响之战', type: 'SEASONAL' },
  { name: '区域', category: '区域行动', type: 'CYCLE' },
  { name: '逃离行动', category: '逃离行动', type: 'CYCLE' },
  { name: '试炼之路+永久卡', category: '常规玩法', type: 'PERMANENT' },
  { name: '主线+挑战更新，按照10关', category: '常规关卡', type: 'PERMANENT' },
  { name: '通行证免费', category: '通行证', type: 'MONTHLY' },
  { name: '任务好礼', category: '常态活动', type: 'MONTHLY' },
  { name: '限时好礼', category: '常态活动', type: 'MONTHLY' },
  { name: '联机挑战', category: '联机挑战', type: 'CYCLE' },
  { name: '特别行动', category: '特别行动', type: 'DAILY' },
  { name: '工会神秘商人', category: '工会系统', type: 'WEEKLY' },
  { name: '广告', category: '广告收益', type: 'DAILY' },
  { name: '巡逻掉落', category: '巡逻收益', type: 'DAILY' },
  { name: '活动1（配件）', category: '主题活动', type: 'EVENT' },
  { name: '活动2（武器，载具）', category: '主题活动', type: 'EVENT' },
  { name: '活动3（宠物）', category: '主题活动', type: 'EVENT' },
  { name: '活动4（无进度或兑换）', category: '主题活动', type: 'EVENT' },
  { name: '活动5（四合一）', category: '主题活动', type: 'EVENT' },
];

// 完整产出矩阵数据：[途径名称, { 资源名称: 数量 }]
const yieldsData: [string, Record<string, number>][] = [
  ['工会远征第一阶段难度12以上', { '史诗配件': 20, '其他钥匙': 152 }],
  ['工会远征第二阶段', { '其他钥匙': 240 }],
  ['工会商店兑换', {
    's杰出装备': 2,
    '史诗配件': 4,
    '杰出配件': 4,
    '史诗宠物': 2,
    '杰出宠物': 4,
    '觉醒水晶': 20,
    's特工碎片': 20,
    '史诗收藏品': 4,
    '杰出收藏品': 4,
    '传奇收藏品': 2,
    '载具零件钥匙': 30,
    '其他钥匙': 75,
  }],
  ['工会远征排行榜', { 's特工碎片': 40, '自选核心': 2 }],
  ['工会探索', { 's特工碎片': 24, '载具零件钥匙': 24, '自选核心': 2 }],
  ['通用兑换', { 's杰出装备': 10, '觉醒水晶': 30, 's特工碎片': 70, '高级收藏之心': 40, '传奇收藏品': 3, '自选核心': 2 }],
  ['日常挑战', { '神器核心': 1.5 }],
  ['回响日常部分', { 's特工碎片': 18 }],
  ['回响结算部分', { 's特工碎片': 30, '自选核心': 2 }],
  ['区域', { 's杰出装备': 3, '史诗配件': 1, '杰出配件': 5, '杰出宠物': 2, '其他钥匙': 48 }],
  ['逃离行动', {
    's杰出装备': 4,
    '史诗配件': 4,
    '杰出配件': 8,
    '史诗宠物': 6,
    '杰出宠物': 8,
    's特工碎片': 20,
    '史诗收藏品': 4,
    '杰出收藏品': 8,
    '载具零件钥匙': 30,
    '其他钥匙': 90,
    '神器核心': 1,
    '异宠核心': 1,
    '配件核心': 2,
    '特工核心': 1,
  }],
  ['试炼之路+永久卡', { '其他钥匙': 45 }],
  ['主线+挑战更新，按照10关', { '史诗配件': 2, '其他钥匙': 100 }],
  ['通行证免费', { 's特工碎片': 3, '其他钥匙': 95 }],
  ['任务好礼', { 's杰出装备': 1, '史诗配件': 1, '史诗宠物': 1, '觉醒水晶': 10, 's特工碎片': 20, '其他钥匙': 220, '自选核心': 0.5 }],
  ['限时好礼', { '其他钥匙': 12 }],
  ['联机挑战', { '史诗收藏品': 1, '传奇收藏品': 1, '特工核心': 2 }],
  ['特别行动', { '史诗收藏品': 7, '自选核心': 0.4 }],
  ['工会神秘商人', { 's杰出装备': 1, '史诗配件': 1, '杰出配件': 1, 's特工碎片': 10, '史诗收藏品': 1, '杰出收藏品': 1, '传奇收藏品': 1, '特工核心': 1 }],
  ['广告', { '其他钥匙': 135 }],
  ['巡逻掉落', { 's特工碎片': 60, '其他钥匙': 120 }],
  ['活动1（配件）', { 's杰出装备': 1, '史诗配件': 4, 'sp特工万能碎片': 5, 's特工碎片': 10, '史诗收藏品': 4, '传奇收藏品': 1, '其他钥匙': 60, '配件核心': 1 }],
  ['活动2（武器，载具）', { 's杰出装备': 1, '史诗配件': 1, 'sp特工万能碎片': 5, 's特工碎片': 10, '传奇载具碎片': 15, '史诗收藏品': 6, '载具零件钥匙': 30, '其他钥匙': 60, '神器核心': 1 }],
  ['活动3（宠物）', { 's杰出装备': 1, '史诗宠物': 1, '觉醒水晶': 30, 'sp特工万能碎片': 5, 's特工碎片': 10, '史诗收藏品': 8, '其他钥匙': 60, '异宠核心': 1 }],
  ['活动4（无进度或兑换）', { 's杰出装备': 1, '史诗配件': 4, '杰出配件': 1, '传奇载具碎片': 10, '其他钥匙': 60, '配件核心': 1 }],
  ['活动5（四合一）', { 's杰出装备': 1, '史诗配件': 1, 'sp特工万能碎片': 5, '史诗收藏品': 6, '其他钥匙': 60, '特工核心': 1 }],
];

async function main() {
  console.log('🚀 开始导入 4.9 版本资源配置与产出数据...');

  const itemMap = new Map<string, string>();
  for (const item of itemsConfig) {
    const record = await prisma.item.upsert({
      where: { name: item.name },
      update: { type: item.type, description: item.description },
      create: item,
    });
    itemMap.set(item.name, record.id);
  }
  console.log(`✅ 已就绪 20 个资源项目`);

  const sourceMap = new Map<string, string>();
  for (const source of sourcesConfig) {
    const record = await prisma.source.upsert({
      where: { name: source.name },
      update: { category: source.category, type: source.type, description: source.description },
      create: source,
    });
    sourceMap.set(source.name, record.id);
  }
  console.log(`✅ 已就绪 27 个获取途径`);

  const YEAR = 2026;
  const MONTH = 8;
  let count = 0;

  for (const [sourceName, itemsObj] of yieldsData) {
    const sourceId = sourceMap.get(sourceName);
    if (!sourceId) continue;

    for (const [itemName, amount] of Object.entries(itemsObj)) {
      const itemId = itemMap.get(itemName);
      if (!itemId) continue;

      await prisma.monthlyYield.upsert({
        where: {
          itemId_sourceId_month_year: {
            itemId,
            sourceId,
            month: MONTH,
            year: YEAR,
          },
        },
        update: {
          amount,
          notes: '4.9版本月基础资源统计',
        },
        create: {
          itemId,
          sourceId,
          amount,
          month: MONTH,
          year: YEAR,
          notes: '4.9版本月基础资源统计',
        },
      });
      count++;
    }
  }

  console.log(`🎉 成功导入 ${count} 条产出记录 (Year: ${YEAR}, Month: ${MONTH})!`);
}

main()
  .catch((e) => {
    console.error('❌ 导入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
