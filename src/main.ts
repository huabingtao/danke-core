import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost:3002,http://127.0.0.1:3002,http://localhost:8004,http://127.0.0.1:8004'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 1. 静态托管历史归档图片
  const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // 2. 静态托管本地创作手稿素材 (Zero-copy 直接映射 my-articles-md)
  const creatorDir = path.resolve(
    process.cwd(),
    '../danke-creator/my-articles-md',
  );
  if (fs.existsSync(creatorDir)) {
    app.useStaticAssets(creatorDir, {
      prefix: '/uploads/creator/',
    });
  }

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
