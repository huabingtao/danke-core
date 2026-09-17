import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dbPath = path.resolve(__dirname, '../data/danke.db');
const db = new Database(dbPath);

console.log('Connecting to db at:', dbPath);

// 1. 检查并添加 icon 字段
const columns = db.prepare('PRAGMA table_info(Item)').all() as Array<{ name: string }>;
const colNames = columns.map((c) => c.name);

if (!colNames.includes('icon')) {
  console.log('Adding column "icon" to Item table...');
  db.prepare('ALTER TABLE Item ADD COLUMN icon TEXT').run();
  console.log('Column "icon" added successfully.');
} else {
  console.log('Column "icon" already exists in Item table.');
}

// 2. 批量集体迁移现有 26 个道具的图标
const items = db.prepare('SELECT id, name, icon FROM Item').all() as Array<{ id: string; name: string; icon: string | null }>;
console.log(`Found ${items.length} items in Item table.`);

const iconDir = path.resolve(__dirname, '../../danke-admin/public/icons/items');
let migratedCount = 0;

const updateStmt = db.prepare('UPDATE Item SET icon = ? WHERE id = ?');

for (const it of items) {
  const defaultIconPath = `/icons/items/${it.name}.png`;
  const physicalFilePath = path.join(iconDir, `${it.name}.png`);

  if (!it.icon) {
    if (fs.existsSync(physicalFilePath)) {
      updateStmt.run(defaultIconPath, it.id);
      migratedCount++;
      console.log(`[MIGRATED] Item: "${it.name}" -> icon: "${defaultIconPath}"`);
    } else {
      // 即使本地文件暂未匹配，也预填标准路径以便后续上传/配置
      updateStmt.run(defaultIconPath, it.id);
      migratedCount++;
      console.log(`[MIGRATED (fallback)] Item: "${it.name}" -> icon: "${defaultIconPath}"`);
    }
  } else {
    console.log(`[EXISTS] Item: "${it.name}" already has icon: "${it.icon}"`);
  }
}

console.log(`Migration completed: ${migratedCount} items updated with default icons.`);
