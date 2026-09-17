import { PrismaClient } from '../generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.resolve(process.cwd(), 'data/danke.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 开始清理废弃菜单并同步新菜单架构...');

  // 1. 查找旧的 "资产产出目录" 及其子菜单
  const oldParent = await prisma.menu.findFirst({
    where: { name: '资产产出目录' },
  });

  if (oldParent) {
    // 删除所有子菜单
    const deletedChildren = await prisma.menu.deleteMany({
      where: { parentId: oldParent.id },
    });
    console.log(`✅ 已删除废弃子菜单 ${deletedChildren.count} 条`);

    // 删除父级目录
    await prisma.menu.delete({
      where: { id: oldParent.id },
    });
    console.log(`✅ 已删除废弃目录 "资产产出目录"`);
  }

  // 也清理任何带有 category 参数的废弃 yields 菜单项
  const deletedLegacy = await prisma.menu.deleteMany({
    where: {
      path: {
        contains: 'category=',
      },
    },
  });
  if (deletedLegacy.count > 0) {
    console.log(`✅ 清理了残留 category 菜单 ${deletedLegacy.count} 条`);
  }

  // 2. 重新编排标准顶级菜单
  const standardMenus = [
    { name: '中盘大屏首页', path: '/', sort: 1, permissionCode: null },
    { name: '资源产出全景', path: '/yields', sort: 2, permissionCode: 'yields:view' },
    { name: '道具配置库', path: '/items', sort: 3, permissionCode: 'items:view' },
    { name: '提醒规则配置', path: '/reminders', sort: 4, permissionCode: 'reminders:view' },
    { name: '导航菜单管理', path: '/menus', sort: 5, permissionCode: 'menu:manage' },
  ];

  for (const m of standardMenus) {
    await prisma.menu.upsert({
      where: { name: m.name },
      update: {
        path: m.path,
        sort: m.sort,
        parentId: null,
        permissionCode: m.permissionCode,
      },
      create: {
        name: m.name,
        path: m.path,
        sort: m.sort,
        parentId: null,
        permissionCode: m.permissionCode,
      },
    });
  }

  // 如果有旧的 "提醒规则"，统一重命名或更新
  const oldReminder = await prisma.menu.findFirst({ where: { name: '提醒规则' } });
  if (oldReminder) {
    await prisma.menu.delete({ where: { id: oldReminder.id } });
  }

  console.log('🎉 导航菜单体系已刷新！当前菜单列表：');
  const allMenus = await prisma.menu.findMany({ orderBy: { sort: 'asc' } });
  allMenus.forEach((menu) => {
    console.log(`  [${menu.sort}] ${menu.name} -> ${menu.path || '(目录)'}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ 清理失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
