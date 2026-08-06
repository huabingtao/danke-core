import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const rawUrl = process.env.DATABASE_URL || 'file:./data/danke.db';
    const relativePath = rawUrl.replace(/^file:/, '');
    const absolutePath = path.resolve(process.cwd(), relativePath);

    // 确保父层目录存在
    const dirPath = path.dirname(absolutePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const sqliteDb = new Database(absolutePath);
    // 开启 SQLite WAL 模式
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('synchronous = NORMAL');
    sqliteDb.close();

    const adapter = new PrismaBetterSqlite3({ url: absolutePath });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('成功连接到 SQLite 数据库! (danke.db - WAL模式) ✅');
    } catch (error) {
      this.logger.error('连接 SQLite 数据库失败! ❌', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('断开 SQLite 数据库连接! 🔌');
  }
}
