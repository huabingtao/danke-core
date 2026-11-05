# danke-core

《弹壳特攻队》共享业务 API，负责认证与权限、道具、产出来源、月度产出、提醒规则、特工、攻略元数据、Wiki 和养成矩阵。数据库由 Core 管理；Web 和 Admin 通过 HTTP API 访问业务数据。

## 技术栈与运行环境

- NestJS 11、Prisma 7、SQLite。
- Node.js 24.18.0（使用工作区已安装的 fnm Node 24）。
- 默认本地端口 `3001`，默认数据库 URL 为 `file:./data/danke.db`，相对 Core 工作目录解析。
- Admin/Web 不应直接打开或修改 SQLite 文件。

复制 `.env.example` 为本机 `.env`，设置独立的 `JWT_SECRET`。生产环境还必须配置 `CORS_ORIGINS`，只列出实际 Web/Admin 源站；不要把服务端密钥放进前端环境变量或提交到 Git。

```env
DATABASE_URL="file:./data/danke.db"
PORT=3001
JWT_SECRET="replace-with-a-private-random-secret"
CORS_ORIGINS=http://localhost:3002,http://localhost:8004
```

缺少 `JWT_SECRET` 时服务拒绝启动。JWT 有效期为一天。

## 常用命令

```bash
npm run start:dev
npm test -- --runInBand
npm run build
npm run start:prod
```

`npm run build` 会写入 `dist/`。数据库 schema 或生产数据调整前必须先备份并确认操作方案；禁止对正式库执行 `prisma db push`、reset 或 destructive seed。`prisma/seed.ts` 用于空库演示初始化，会清空多类现存数据，不得对已有业务数据库运行。

## API 概览

公开读取接口包括：

- `GET /items`、`GET /items/:id`
- `GET /sources`、`GET /sources/:id`
- `GET /yields`、`GET /yields/monthly-report?year=YYYY&month=M`
- `GET /reminders`、`GET /reminders/daily-digest?date=YYYY-MM-DD`
- `GET /api/agents`、`GET /api/agents/:code`
- `GET /api/strategies`、`GET /api/strategies/:slug`
- `GET /api/wiki/entries`、`GET /api/wiki/matrices`

认证接口为 `POST /auth/login`、`GET /auth/profile` 和 `POST /auth/change-password`。敏感写接口须携带 `Authorization: Bearer <token>`，由 Core 服务端验证 JWT 与权限；前端菜单或按钮隐藏不构成权限控制。

活动目前只有 Prisma `GameEvent` 模型，CRUD API 尚未实现。文章同步与历史记录仍处于兼容期；不要通过管理 API 或手工 SQL 删除旧记录。

## 兼容说明

- Wiki、攻略和特工 API 保留 `/api/...` 与已有别名，逐步替换旧同步链路时不随意改路径。
- CORS 只允许 `CORS_ORIGINS` 中列出的浏览器来源；CORS 不替代身份认证和权限校验。
- `.env`、数据库、备份和部署密钥均为环境数据，不提交到仓库。
