import { PrismaClient } from '../generated/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const adapter = new PrismaMariaDb(connectionString, { useTextProtocol: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('开始填充全新的 RBAC 动态初始数据... 🌱');

  // 1. 清理已有数据
  await prisma.monthlyYield.deleteMany();
  await prisma.gameEvent.deleteMany();
  await prisma.source.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  // 2. 创建权限 (Permissions)
  const perms = [
    { name: '查看物品配置库', code: 'items:view', type: 'PAGE' },
    { name: '创建物品', code: 'item:create', type: 'BUTTON' },
    { name: '删除物品', code: 'item:delete', type: 'BUTTON' },
    { name: '查看限时活动库', code: 'events:view', type: 'PAGE' },
    { name: '创建活动', code: 'event:create', type: 'BUTTON' },
    { name: '删除活动', code: 'event:delete', type: 'BUTTON' },
    { name: '查看资产产出看板', code: 'yields:view', type: 'PAGE' },
    { name: '录入修改资产产出', code: 'yield:edit', type: 'BUTTON' },
    { name: '管理导航菜单', code: 'menu:manage', type: 'PAGE' },
  ];

  const permissionMap: { [code: string]: any } = {};
  for (const p of perms) {
    const created = await prisma.permission.create({ data: p });
    permissionMap[p.code] = created;
  }
  console.log('权限创建成功! ✅');

  // 3. 创建角色 (Roles) 并分配权限
  // ADMIN 拥有所有权限
  const adminRole = await prisma.role.create({
    data: {
      name: '超级博主',
      code: 'ADMIN',
      permissions: {
        connect: Object.values(permissionMap).map(p => ({ id: p.id })),
      },
    },
  });

  // ASSISTANT 仅拥有 yields:view, yield:edit, items:view, events:view
  const assistantRole = await prisma.role.create({
    data: {
      name: '录入助理',
      code: 'ASSISTANT',
      permissions: {
        connect: [
          { id: permissionMap['yields:view'].id },
          { id: permissionMap['yield:edit'].id },
          { id: permissionMap['items:view'].id },
          { id: permissionMap['events:view'].id },
        ],
      },
    },
  });
  console.log('角色创建成功! ✅');

  // 4. 创建用户 (Users) 并加密密码
  const hashedPassword = await bcrypt.hash('123', 10);

  const userAdmin = await prisma.user.create({
    data: {
      username: '弹壳呱呱',
      password: hashedPassword,
      roleId: adminRole.id,
    },
  });

  const userAssistant = await prisma.user.create({
    data: {
      username: '助理小白',
      password: hashedPassword,
      roleId: assistantRole.id,
    },
  });
  console.log('测试用户创建成功! ✅ (密码为: 123)');

  // 5. 创建树形结构菜单项 (Menus)
  // 顶级菜单项
  const mDashboard = await prisma.menu.create({
    data: {
      name: '中盘大屏首页',
      path: '/',
      sort: 1,
    },
  });

  const mCatalogFolder = await prisma.menu.create({
    data: {
      name: '资产产出目录',
      path: null, // 无路径，代表目录夹
      sort: 2,
    },
  });

  const mItems = await prisma.menu.create({
    data: {
      name: '道具配置库',
      path: '/items',
      sort: 3,
      permissionCode: 'items:view',
    },
  });

  const mEvents = await prisma.menu.create({
    data: {
      name: '限时活动库',
      path: '/events',
      sort: 4,
      permissionCode: 'events:view',
    },
  });

  const mMenusAdmin = await prisma.menu.create({
    data: {
      name: '导航菜单管理',
      path: '/menus',
      sort: 5,
      permissionCode: 'menu:manage',
    },
  });

  // 资产产出目录下的二级子菜单 (parentId 指向 mCatalogFolder)
  const submenusData = [
    { name: '广告', path: '/yields?category=广告', sort: 1, parentId: mCatalogFolder.id },
    { name: '日常挑战', path: '/yields?category=日常挑战', sort: 2, parentId: mCatalogFolder.id },
    { name: '回响之战', path: '/yields?category=回响之战', sort: 3, parentId: mCatalogFolder.id },
    { name: '每日活动', path: '/yields?category=每日活动', sort: 4, parentId: mCatalogFolder.id },
    { name: '主线关卡', path: '/yields?category=主线关卡', sort: 5, parentId: mCatalogFolder.id },
    { name: '挑战', path: '/yields?category=挑战', sort: 6, parentId: mCatalogFolder.id },
    { name: '任务好礼', path: '/yields?category=任务好礼', sort: 7, parentId: mCatalogFolder.id },
    { name: '公会', path: '/yields?category=公会', sort: 8, parentId: mCatalogFolder.id },
  ];

  for (const sm of submenusData) {
    await prisma.menu.create({ data: sm });
  }
  console.log('层级导航菜单创建成功! ✅');

  // 6. 创建物品 (Items)
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
  console.log('游戏道具底库初始化成功! ✅');

  // 7. 创建产出途径 (Sources) 并关联类目
  const sourcesToCreate = [
    // 广告
    { name: '每日广告', type: 'AD', category: '广告', subcategory: '每日', description: '每日看广告获取物品' },
    { name: '每周广告', type: 'AD', category: '广告', subcategory: '每周', description: '每周看广告获取物品' },
    { name: '每月广告', type: 'AD', category: '广告', subcategory: '每月', description: '每月看广告获取物品' },

    // 日常挑战
    { name: '日常挑战通关', type: 'DAILY_CHALLENGE', category: '日常挑战', subcategory: null, description: '每日挑战关卡' },

    // 回响之战
    { name: '回响之战阶段奖励', type: 'ECHO_CHALLENGE', category: '回响之战', subcategory: '阶段奖励', description: '回响之战达到特定伤害值获取的阶段宝箱' },
    { name: '回响之战赛季奖励', type: 'ECHO_CHALLENGE', category: '回响之战', subcategory: '赛季奖励', description: '回响之战赛季结算排名奖励' },

    // 每日活动
    { name: '饼干矿洞', type: 'DAILY_EVENT', category: '每日活动', subcategory: '矿洞挑战', description: '饼干矿洞金币挑战' },
    { name: '精华矿洞', type: 'DAILY_EVENT', category: '每日活动', subcategory: '矿洞挑战', description: '配件精华挑战' },
    { name: '黄金矿洞', type: 'DAILY_EVENT', category: '每日活动', subcategory: '矿洞挑战', description: '黄金矿洞挑战' },
    { name: '特别行动', type: 'DAILY_EVENT', category: '每日活动', subcategory: '特别行动', description: '每日特别任务行动' },

    // 主线关卡
    { name: '主线章节宝箱', type: 'MAIN_STAGE', category: '主线关关卡', subcategory: '章节宝箱', description: '首次通关章节的进度宝箱' },
    { name: '主线关卡掉落', type: 'MAIN_STAGE', category: '主线关关卡', subcategory: '主线关卡掉落', description: '通关或扫荡主线关卡掉落奖励' },

    // 挑战
    { name: '试炼之路排行榜', type: 'CHALLENGE', category: '挑战', subcategory: '排行榜', description: '试炼之路排行榜排名结算奖励' },
    { name: '试炼之路成就', type: 'CHALLENGE', category: '挑战', subcategory: '试炼成就', description: '试炼之路层数达标成就' },
    { name: '主线挑战', type: 'CHALLENGE', category: '挑战', subcategory: '主线挑战', description: '主线关卡附加挑战' },
    { name: '超级挑战', type: 'CHALLENGE', category: '挑战', subcategory: '超级挑战', description: '超级挑战关卡' },
    { name: '区域行动', type: 'CHALLENGE', category: '挑战', subcategory: '区域行动', description: '区域封锁行动' },
    { name: '逃离行动', type: 'CHALLENGE', category: '挑战', subcategory: '逃离行动', description: '限时逃离行动' },
    { name: '联机挑战', type: 'CHALLENGE', category: '挑战', subcategory: '联机挑战', description: '双人联机合作挑战' },

    // 任务好礼
    { name: '任务好礼奖励', type: 'QUESTS', category: '任务好礼', subcategory: null, description: '每日任务、每周任务及签到奖励' },

    // 公会
    { name: '公会商店', type: 'GUILD', category: '公会', subcategory: '商店', description: '公会商店积分兑换' },
    { name: '公会神秘商人', type: 'GUILD', category: '公会', subcategory: '神秘商人', description: '神秘商人的特惠兑换' },
    { name: '公会探索进度', type: 'GUILD', category: '公会', subcategory: '探索进度', description: '公会探索积分达标礼包' },
    { name: '公会探索boss', type: 'GUILD', category: '公会', subcategory: '探索boss', description: '击败探索boss的战利品' },
    { name: '公会远征一阶段', type: 'GUILD', category: '公会', subcategory: '远征一阶段', description: '公会远征第一阶段个人及团队积分' },
    { name: '公会远征二阶段', type: 'GUILD', category: '公会', subcategory: '远征二阶段', description: '公会远征第二阶段积分奖励' },
    { name: '公会远征结算', type: 'GUILD', category: '公会', subcategory: '远征结算', description: '公会远征期终结算排名包' },
  ];

  const sourceMap: { [name: string]: any } = {};
  for (const s of sourcesToCreate) {
    const created = await prisma.source.create({ data: s });
    sourceMap[s.name] = created;
  }
  console.log('产出来源配置加载成功! ✅');

  // 8. 创建测试用的月度产出明细数据 (MonthlyYields) - 2026年7月
  const mockYields = [
    { item: itemGems, source: sourceMap['每日广告'], amount: 300 },
    { item: itemGems, source: sourceMap['每周广告'], amount: 100 },
    { item: itemGems, source: sourceMap['每月广告'], amount: 500 },
    { item: itemSKey, source: sourceMap['日常挑战通关'], amount: 5 },
    { item: itemGems, source: sourceMap['日常挑战通关'], amount: 1500 },
    { item: itemGems, source: sourceMap['回响之战阶段奖励'], amount: 2000 },
    { item: itemSKey, source: sourceMap['回响之战阶段奖励'], amount: 2 },
    { item: itemGems, source: sourceMap['回响之战赛季奖励'], amount: 3000 },
    { item: itemGems, source: sourceMap['饼干矿洞'], amount: 200 },
    { item: itemTechPart, source: sourceMap['精华矿洞'], amount: 3 },
    { item: itemEpicEquip, source: sourceMap['黄金矿洞'], amount: 1 },
    { item: itemEpicEquip, source: sourceMap['特别行动'], amount: 1 },
    { item: itemSKey, source: sourceMap['主线章节宝箱'], amount: 10 },
    { item: itemGems, source: sourceMap['主线关卡掉落'], amount: 1200 },
    { item: itemGems, source: sourceMap['试炼之路排行榜'], amount: 800 },
    { item: itemSKey, source: sourceMap['试炼之路成就'], amount: 4 },
    { item: itemEpicEquip, source: sourceMap['主线挑战'], amount: 2 },
    { item: itemSKey, source: sourceMap['任务好礼奖励'], amount: 6 },
    { item: itemGems, source: sourceMap['任务好礼奖励'], amount: 1000 },
    { item: itemSKey, source: sourceMap['公会商店'], amount: 2 },
    { item: itemEpicEquip, source: sourceMap['公会神秘商人'], amount: 1 },
    { item: itemGems, source: sourceMap['公会远征一阶段'], amount: 1000 },
    { item: itemSKey, source: sourceMap['公会远征结算'], amount: 5 },
  ];

  for (const y of mockYields) {
    await prisma.monthlyYield.create({
      data: {
        itemId: y.item.id,
        sourceId: y.source.id,
        amount: y.amount,
        month: 7,
        year: 2026,
        notes: `测试数据 - ${y.source.name} 产出`,
      },
    });
  }

  console.log('月度产出明细初始化数据创建成功! ✅');
  console.log('所有全新的 RBAC 动态初始数据填充完成! 🌳');
}

main()
  .catch((e) => {
    console.error('填充初始数据时发生错误 ❌', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
