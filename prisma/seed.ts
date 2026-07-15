import { PrismaClient } from '../generated/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const adapter = new PrismaMariaDb(connectionString, { useTextProtocol: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('开始填充初始数据... 🌱');

  // 1. 清理已有数据
  await prisma.monthlyYield.deleteMany();
  await prisma.gameEvent.deleteMany();
  await prisma.source.deleteMany();
  await prisma.item.deleteMany();
  await prisma.menu.deleteMany();

  // 2. 创建物品 (Items)
  const itemSKey = await prisma.item.create({
    data: {
      name: 'S钥匙',
      type: 'KEY',
      description: '用于开启S级军备宝箱',
      stats: JSON.stringify({ description: '无直接战斗加成' }),
    },
  });

  const itemGems = await prisma.item.create({
    data: {
      name: '宝石',
      type: 'CURRENCY',
      description: '游戏内核心代币，用于购买各种资源',
      stats: JSON.stringify({ description: '游戏代币' }),
    },
  });

  const itemEpicEquip = await prisma.item.create({
    data: {
      name: '随机杰出装备',
      type: 'EQUIPMENT',
      description: '开启后随机获得一件杰出品质(紫色)装备',
      stats: JSON.stringify({ baseAtkAdd: 200, baseHpAdd: 1000 }),
    },
  });

  const itemTechPart = await prisma.item.create({
    data: {
      name: '随机精良配件',
      type: 'TECH_PART',
      description: '提供特定技能的额外攻击效果',
      stats: JSON.stringify({ skillName: '哨箭', bonusAtk: 150 }),
    },
  });

  console.log('物品创建成功! ✅');

  // 3. 创建产出途径 (Sources)
  const sourceDailyChallenge = await prisma.source.create({
    data: {
      name: '每日挑战',
      type: 'DAILY',
      description: '每天刷新一次的高难度挑战关卡',
    },
  });

  const sourceDailySignIn = await prisma.source.create({
    data: {
      name: '每日签到',
      type: 'DAILY',
      description: '每日登录游戏即可领取的福利',
    },
  });

  const sourceWeeklyChest = await prisma.source.create({
    data: {
      name: '每周宝箱',
      type: 'WEEKLY',
      description: '通过完成每日任务累积活跃度开启的周常宝箱',
    },
  });

  const sourceSpecialEvent = await prisma.source.create({
    data: {
      name: '限时活动奖励',
      type: 'EVENT',
      description: '各种节日和主题的限时活动任务或兑换产出',
    },
  });

  console.log('产出途径创建成功! ✅');

  // 4. 创建限时活动 (GameEvents)
  const anniversaryEvent = await prisma.gameEvent.create({
    data: {
      name: '弹壳周年庆典活动',
      startDate: new Date('2026-07-01T00:00:00Z'),
      endDate: new Date('2026-07-07T23:59:59Z'),
      rewards: JSON.stringify({ sKeys: 15, gems: 3000, randomEpicEquip: 1 }),
    },
  });

  console.log('限时活动创建成功! ✅');

  // 5. 创建月度产出明细 (MonthlyYields) - 模拟 2026 年 7 月份数据
  // 每日挑战产出：5把S钥匙，1500宝石
  await prisma.monthlyYield.create({
    data: {
      itemId: itemSKey.id,
      sourceId: sourceDailyChallenge.id,
      amount: 5,
      month: 7,
      year: 2026,
      notes: '每日挑战固定箱子和通关产出',
    },
  });

  await prisma.monthlyYield.create({
    data: {
      itemId: itemGems.id,
      sourceId: sourceDailyChallenge.id,
      amount: 1500,
      month: 7,
      year: 2026,
      notes: '每日挑战通关宝石奖励',
    },
  });

  // 每日签到产出：300宝石
  await prisma.monthlyYield.create({
    data: {
      itemId: itemGems.id,
      sourceId: sourceDailySignIn.id,
      amount: 300,
      month: 7,
      year: 2026,
      notes: '7月每日登录累计产出',
    },
  });

  // 周常宝箱产出：4把S钥匙
  await prisma.monthlyYield.create({
    data: {
      itemId: itemSKey.id,
      sourceId: sourceWeeklyChest.id,
      amount: 4,
      month: 7,
      year: 2026,
      notes: '每周活跃度满箱子产出累计',
    },
  });

  // 周年庆限时活动产出：10把S钥匙，2000宝石，1个杰出装备（关联活动）
  await prisma.monthlyYield.create({
    data: {
      itemId: itemSKey.id,
      sourceId: sourceSpecialEvent.id,
      eventId: anniversaryEvent.id,
      amount: 10,
      month: 7,
      year: 2026,
      notes: '周年庆日常任务与累签S钥匙产出',
    },
  });

  await prisma.monthlyYield.create({
    data: {
      itemId: itemGems.id,
      sourceId: sourceSpecialEvent.id,
      eventId: anniversaryEvent.id,
      amount: 2000,
      month: 7,
      year: 2026,
      notes: '周年庆集市拼图和首充翻倍活动宝石',
    },
  });

  await prisma.monthlyYield.create({
    data: {
      itemId: itemEpicEquip.id,
      sourceId: sourceSpecialEvent.id,
      eventId: anniversaryEvent.id,
      amount: 1,
      month: 7,
      year: 2026,
      notes: '周年庆积分兑换杰出装备自选箱',
    },
  });

  console.log('月度产出明细数据创建成功! ✅');

  // 6. 创建导航菜单项
  await prisma.menu.create({
    data: {
      name: '每日产出',
      path: '/yields?type=DAILY',
      sort: 1,
    },
  });

  await prisma.menu.create({
    data: {
      name: '每周产出',
      path: '/yields?type=WEEKLY',
      sort: 2,
    },
  });

  await prisma.menu.create({
    data: {
      name: '活动产出',
      path: '/yields?type=EVENT',
      sort: 3,
    },
  });

  console.log('二级菜单数据创建成功! ✅');
  console.log('所有初始数据填充完成! 🌳');
}

main()
  .catch((e) => {
    console.error('填充初始数据时发生错误 ❌', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
