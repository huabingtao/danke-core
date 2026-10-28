import { PrismaClient } from '../generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import assert from 'node:assert/strict';

interface ImportData {
  year: number;
  month: number;
  version: string;
  sourceImage: string;
  note: string;
  expectedRecords: number;
  columns: {
    column: number;
    name: string;
    expectedTotal: number;
    imageTotal: number;
  }[];
  rows: {
    label: string;
    sourceName: string;
    notes?: string;
    amounts: Record<string, number>;
  }[];
  createItems: {
    name: string;
    type: string;
    icon: string | null;
    description: string;
  }[];
  createSources: {
    name: string;
    type?: string;
    category?: string;
    inheritFrom?: string;
    description: string;
  }[];
  pending: unknown[];
}

const directory = path.resolve(__dirname, '../docs/imports/2026-10-v5.3');
const fixturePath = path.join(directory, 'data.json');
const data: ImportData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const arguments_ = process.argv.slice(2);
let apply = false;
let databaseUrl = process.env.DATABASE_URL || 'file:./data/danke.db';
for (let index = 0; index < arguments_.length; index++) {
  const value = arguments_[index];
  if (value === '--apply') apply = true;
  else if (value === '--database' && arguments_[index + 1])
    databaseUrl = arguments_[++index];
  else throw new Error(`不支持的参数：${value}`);
}
assert(!databaseUrl.includes('://'), '仅支持本地SQLite文件');
const databasePath = path.resolve(databaseUrl.replace(/^file:/, ''));
assert(
  fs.statSync(databasePath).isFile(),
  '数据库文件必须已经存在，不自动建库',
);

const key = (itemId: string, sourceId: string) => `${itemId}:${sourceId}`;
const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

function validateFixture() {
  assert.equal(data.year, 2026);
  assert.equal(data.month, 10);
  assert.equal(data.columns.length, 20);
  assert.equal(data.rows.length, 28);
  assert.equal(data.expectedRecords, 127);
  assert.equal(new Set(data.columns.map((column) => column.name)).size, 20);
  assert.equal(new Set(data.rows.map((row) => row.sourceName)).size, 28);
  let count = 0;
  for (const row of data.rows) {
    assert(row.sourceName.trim(), '途径名称不能为空');
    for (const [column, amount] of Object.entries(row.amounts)) {
      assert(
        data.columns.some((entry) => String(entry.column) === column),
        `未知图片列：${column}`,
      );
      assert(
        Number.isFinite(amount) && amount > 0,
        `非法数量：${row.label}/${column}`,
      );
      count++;
    }
  }
  assert.equal(count, data.expectedRecords);
  for (const column of data.columns) {
    const total = data.rows.reduce(
      (sum, row) => sum + (row.amounts[String(column.column)] ?? 0),
      0,
    );
    assert(
      Math.abs(total - column.expectedTotal) < 1e-8,
      `${column.name}合计不符：${total}`,
    );
    if (column.expectedTotal !== column.imageTotal) {
      assert.equal(column.name, '载具零件钥匙');
      assert.equal(column.expectedTotal, 142);
      assert.equal(column.imageTotal, 114);
    }
  }
}

async function main() {
  validateFixture();
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databasePath }),
  });
  let backupPath: string | null = null;
  try {
    // Snapshot all protected records so an import cannot silently change history.
    const beforeItems = await prisma.item.findMany({ orderBy: { id: 'asc' } });
    const beforeSources = await prisma.source.findMany({
      orderBy: { id: 'asc' },
    });
    for (const column of data.columns) {
      assert(
        beforeItems.some((item) => item.name === column.name) ||
          data.createItems.some((item) => item.name === column.name),
        `缺少已确认道具：${column.name}`,
      );
    }
    for (const row of data.rows) {
      assert(
        beforeSources.some((source) => source.name === row.sourceName) ||
          data.createSources.some((source) => source.name === row.sourceName),
        `缺少已确认途径：${row.sourceName}`,
      );
    }
    const newItems = data.createItems.filter(
      (item) => !beforeItems.some((old) => old.name === item.name),
    );
    const newSources = data.createSources.filter(
      (source) => !beforeSources.some((old) => old.name === source.name),
    );
    for (const source of newSources) {
      if (source.inheritFrom)
        assert(
          beforeSources.some((old) => old.name === source.inheritFrom),
          '缺少主线分类参考途径',
        );
    }
    if (!apply) {
      console.log(
        JSON.stringify(
          {
            mode: 'preflight',
            databasePath,
            year: data.year,
            month: data.month,
            records: data.expectedRecords,
            newItems,
            newSources,
            columns: data.columns,
            pending: data.pending,
          },
          null,
          2,
        ),
      );
      return;
    }

    // SQLite's online backup includes committed WAL data, unlike copying the .db file.
    const backupDirectory = path.join(
      os.homedir(),
      '.local/state/danke-core/import-backups',
    );
    fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    backupPath = path.join(
      backupDirectory,
      `2026-10-v5.3-${Date.now()}-${randomUUID()}.db`,
    );
    const sqlite = new Database(databasePath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      await sqlite.backup(backupPath);
      fs.chmodSync(backupPath, 0o600);
    } finally {
      sqlite.close();
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const beforeYields = await tx.monthlyYield.findMany({
          orderBy: { id: 'asc' },
        });
        const items = new Map(beforeItems.map((item) => [item.name, item]));
        const sources = new Map(
          beforeSources.map((source) => [source.name, source]),
        );
        let createdItems = 0;
        let createdSources = 0;
        for (const item of data.createItems) {
          if (!items.has(item.name)) {
            const record = await tx.item.create({ data: item });
            items.set(record.name, record);
            createdItems++;
          }
        }
        for (const source of data.createSources) {
          if (!sources.has(source.name)) {
            const inherited = source.inheritFrom
              ? sources.get(source.inheritFrom)
              : undefined;
            const record = await tx.source.create({
              data: {
                name: source.name,
                type: inherited?.type ?? source.type!,
                category: inherited?.category ?? source.category!,
                subcategory: inherited?.subcategory ?? null,
                description: source.description,
              },
            });
            sources.set(record.name, record);
            createdSources++;
          }
        }
        const entries = data.rows.flatMap((row) =>
          Object.entries(row.amounts).map(([columnNumber, amount]) => {
            const column = data.columns.find(
              (entry) => String(entry.column) === columnNumber,
            )!;
            return {
              itemId: items.get(column.name)!.id,
              sourceId: sources.get(row.sourceName)!.id,
              year: data.year,
              month: data.month,
              amount,
              notes: [data.note, `原图途径：${row.label}`, row.notes]
                .filter(Boolean)
                .join('；'),
            };
          }),
        );
        const importedKeys = new Set(
          entries.map((entry) => key(entry.itemId, entry.sourceId)),
        );
        const existing = new Map(
          beforeYields
            .filter(
              (entry) => entry.year === data.year && entry.month === data.month,
            )
            .map((entry) => [key(entry.itemId, entry.sourceId), entry]),
        );
        const protectedRows = (rows: typeof beforeYields) =>
          rows.filter(
            (entry) =>
              entry.year !== data.year ||
              entry.month !== data.month ||
              !importedKeys.has(key(entry.itemId, entry.sourceId)),
          );
        let createdYields = 0;
        let updatedYields = 0;
        let unchangedYields = 0;
        for (const entry of entries) {
          const old = existing.get(key(entry.itemId, entry.sourceId));
          if (old && old.amount === entry.amount && old.notes === entry.notes) {
            unchangedYields++;
            continue;
          }
          await tx.monthlyYield.upsert({
            where: {
              itemId_sourceId_month_year: {
                itemId: entry.itemId,
                sourceId: entry.sourceId,
                month: entry.month,
                year: entry.year,
              },
            },
            create: entry,
            update: { amount: entry.amount, notes: entry.notes },
          });
          if (old) updatedYields++;
          else createdYields++;
        }
        const afterYields = await tx.monthlyYield.findMany({
          orderBy: { id: 'asc' },
        });
        const imported = afterYields.filter(
          (entry) =>
            entry.year === data.year &&
            entry.month === data.month &&
            importedKeys.has(key(entry.itemId, entry.sourceId)),
        );
        assert.equal(imported.length, 127);
        for (const expected of entries) {
          const actual = imported.find(
            (entry) =>
              key(entry.itemId, entry.sourceId) ===
              key(expected.itemId, expected.sourceId),
          );
          assert(
            actual &&
              actual.amount === expected.amount &&
              actual.notes === expected.notes,
            '逐格回读校验失败',
          );
        }
        const totals = data.columns.map((column) => {
          const itemId = items.get(column.name)!.id;
          const actual = imported
            .filter((entry) => entry.itemId === itemId)
            .reduce((sum, entry) => sum + entry.amount, 0);
          assert(
            Math.abs(actual - column.expectedTotal) < 1e-8,
            `${column.name}数据库合计不符`,
          );
          return {
            name: column.name,
            actual: Number(actual.toFixed(8)),
            imageTotal: column.imageTotal,
            expectedTotal: column.expectedTotal,
            matchesExpected: true,
          };
        });
        const protectedBefore = fingerprint(protectedRows(beforeYields));
        const protectedAfter = fingerprint(protectedRows(afterYields));
        assert.equal(
          protectedAfter,
          protectedBefore,
          '历史或无关产出被修改，事务回滚',
        );
        const afterItems = await tx.item.findMany({ orderBy: { id: 'asc' } });
        const afterSources = await tx.source.findMany({
          orderBy: { id: 'asc' },
        });
        assert.deepEqual(
          afterItems.filter((item) =>
            beforeItems.some((old) => old.id === item.id),
          ),
          beforeItems,
        );
        assert.deepEqual(
          afterSources.filter((source) =>
            beforeSources.some((old) => old.id === source.id),
          ),
          beforeSources,
        );
        const augustRows = afterYields.filter(
          (entry) => entry.year === 2026 && entry.month === 8,
        );
        assert.deepEqual(
          augustRows,
          beforeYields.filter(
            (entry) => entry.year === 2026 && entry.month === 8,
          ),
        );
        assert.equal(
          afterYields.filter(
            (entry) => entry.itemId === items.get('载具核心')!.id,
          ).length,
          0,
          '载具核心只建档，不能凭空生成产出',
        );
        return {
          createdItems,
          createdSources,
          createdYields,
          updatedYields,
          unchangedYields,
          importedRecords: imported.length,
          totalItems: afterItems.length,
          totalSources: afterSources.length,
          octoberRecords: afterYields.filter(
            (entry) => entry.year === data.year && entry.month === data.month,
          ).length,
          augustRecords: augustRows.length,
          protectedBefore,
          protectedAfter,
          existingMetadataUnchanged: true,
          totals,
        };
      },
      { timeout: 30000 },
    );
    console.log(
      JSON.stringify(
        {
          mode: 'applied',
          completedAt: new Date().toISOString(),
          databasePath,
          backupPath,
          year: data.year,
          month: data.month,
          fixtureSha256: fingerprint(data),
          sourceImageSha256: createHash('sha256')
            .update(fs.readFileSync(path.join(directory, data.sourceImage)))
            .digest('hex'),
          ...result,
          pending: data.pending,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (backupPath)
      console.error(`导入未完成，SQLite备份保留在：${backupPath}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
