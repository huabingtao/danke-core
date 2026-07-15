# 《弹壳特攻队》资产与攻略后端数据中心

这是一个基于 **NestJS 11** 和 **Prisma 7 ORM** 构建的高性能、可扩展后端数据中心。专门用于存储和管理《弹壳特攻队》游戏内的物品、产出途径、活动和月度产出明细，并为攻略网站、微信公众号排版工具和小红书等自媒体生成器提供标准且安全的 JSON API。

---

## 🛠️ 技术栈
*   **框架**：NestJS 11 + TypeScript
*   **ORM**：Prisma 7
*   **数据库**：MySQL (已完美兼容 MySQL 5.6 历史版本)
*   **驱动适配器**：`@prisma/adapter-mariadb` (启用文本协议兼容老版本)

---

## 🚀 快速启动指南

### 1. 准备工作
确保本地已安装 Node.js，且本地 **MySQL 服务已正常启动**。
*   MySQL 默认地址：`localhost:3306`
*   数据库名称：`danke`

### 2. 配置环境变量
项目根目录下的 [`.env`](.env) 文件已预置以下配置。您可以根据实际情况进行修改：
```env
DATABASE_URL="mysql://root:hbt223123@localhost:3306/danke?charset=utf8mb4"
PORT=3000
ADMIN_API_KEY="danke_super_secret_key_123"
```
> **⚠️ 注意**：`?charset=utf8mb4` 必须保留，以防止插入中文物品名时报 `Incorrect string value` 字符编码错误。

### 3. 生成 Prisma 数据库客户端
首次拉取或每次修改 `prisma/schema.prisma` 后运行：
```bash
npx prisma generate
```

### 4. 填充初始测试数据 (Seeding)
运行以下命令，向您的本地 MySQL 数据库中自动填充《弹壳特攻队》的初始数据（包括：S钥匙、宝石、每日挑战、周常箱子和周年庆活动产出等）：
```bash
npx prisma db seed
```

### 5. 启动服务
```bash
# 启动开发监听模式 (代码修改自动重启)
npm run start:dev

# 生产构建与启动
npm run build
npm run start
```

---

## 📊 可视化数据管理 (免代码后台)

本项目配置了 **Prisma Studio**。您无需编写后台管理页面，只需在终端运行以下命令：
```bash
npx prisma studio
```
它会在浏览器中自动打开 `http://localhost:5555`，提供一个功能强大的 **Excel 表格级界面**。您可以在这里直接**双击修改**、**直接录入**或**批量删除**特工道具、产出、活动等数据，修改后点击 `Save Changes` 即可保存。

---

## 🔑 核心接口说明 (APIs)

所有的写接口（`POST`、`DELETE`等）都受 `ApiKeyGuard` 保护，需要在 HTTP Request Header 中携带：
`x-api-key: danke_super_secret_key_123`

### 1. 物品管理 (Items)
*   **`GET /items`**：获取物品列表（公开）。
*   **`POST /items`**（写保护）：创建新物品。
    *   **Payload 示例**：
        ```json
        {
          "name": "破坏者之力",
          "type": "EQUIPMENT",
          "description": "强力S级武器",
          "stats": { "atk": 500, "description": "发射黑洞吸引敌人" }
        }
        ```
        > **💡 说明**：`stats` 会在存库时自动序列化，返回时自动解析为 JSON 对象，方便未来伤害计算器直接使用。

### 2. 产出明细与报表 (Yields)
*   **`GET /yields`**：获取扁平明细列表（公开）。支持 `year`、`month`、`itemId`、`sourceId` 过滤。
*   **`GET /yields/monthly-report?year=2026&month=7`**：获取**结构化聚合报表**（公开）。
    *   **返回格式**：将产出途径作为 `columns`（列），物品作为 `rows`（行），并在交叉点给出对应数值和行总计。直接供给攻略网站渲染表格。
*   **`POST /yields`**（写保护）：新增或覆盖更新单项月度产出数值。

---

## 🔍 故障排查与 Debug 手册

### Q1：启动时报错 `P1000: Authentication failed against database server`
*   **原因**：`.env` 中的 MySQL 密码不正确，或者用户名不对。
*   **解决方法**：打开 `.env` 文件，检查 `DATABASE_URL` 中的 `root:hbt223123` 密码是否与您本地 MySQL 的 root 密码完全一致，修改后保存重新运行。

### Q2：启动时报错 `Port 3000 is already in use`
*   **原因**：3000 端口已被其他服务占用。
*   **解决方法**：
    1. 修改 `.env` 文件中的 `PORT=3000` 为其他端口（如 `PORT=3001`）。
    2. 或者在终端运行 `kill -9 $(lsof -t -i:3000)` 杀掉占用端口的进程。

### Q3：插入中文物品或产出途径时报错 `Incorrect string value`
*   **原因**：本地 MySQL 数据库默认字符集是 `latin1` 等非 UTF-8 字符集，或者连接编码不对。
*   **解决方法**：确保 `.env` 中的 `DATABASE_URL` 结尾带有 `?charset=utf8mb4` 字段，且创建数据库时使用了 `utf8mb4` 字符集。
