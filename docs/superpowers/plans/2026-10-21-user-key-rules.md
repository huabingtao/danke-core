# 口述钥匙规则与十月回填 Implementation Plan

**Goal:** 先保存用户最新口述 JSON，再按已有钥匙用途分类回填 2026 年 10 月并显示来源口径。

**Architecture:** 使用已有 SQLite MonthlyYield 的 notes 保存结构化口径，无新 API 或数据库结构。JSON 是此次导入依据。已明确来源只替换本月本来源的钥匙记录；拆开探索进度/Boss、试炼/永久卡，保留未提及原图记录并单列。八月及非钥匙产出不变。

**Tech Stack:** Python sqlite3、Next.js Client Components、现有 shadcn/ui、Vitest。

## Global Constraints

- 每周按四次，每日按十月 31 天；通行证免费档尚未确认。
- 任务好礼四种各一期，每种 59，合计 236。巡逻与主线随机各 93，不平均分配到三种钥匙。
- 试炼为收藏品钥匙每周 5，即 20；永久卡为权益奖励 31，不能标为零氪稳定产出。
- 远征按本次最新周口径取代旧月口径，难度数值为用户选定参考值，不称统计中位数。
- 保留未知原图记录，不与口述参考混为真实月产出。禁止运行旧导入脚本。

## Tasks

- [x] `docs/imports/2026-10-v5.3/key-review/user-rules.json` 保存 schemaVersion 2、原话、别名、周期、计算、条件、每种钥匙与待确认项；保留批次 1 历史。
- [x] `scripts/import_user_key_rules.py` 实现预览、备份、一次事务 upsert、仅删除明确替代的旧钥匙、差异记录、强制失败回滚验证。
- [x] 在临时 SQLite 副本验证计算、重复执行无重复、故障完整回滚、八月 104 条与非钥匙逐条不变，再应用真实数据库。
- [x] `danke-admin/lib/key-reference.ts` 解析 notes 和独立统计口述、随机待拆、权益、旧图数据；测试未知/坏格式降级。
- [x] 更新 `components/KeyCategoryFilter.tsx`、`app/yields/page.tsx`，显示口述参考与数据口径说明按钮、单元格备注，并保留原分类、月份切换和导出。
- [x] Vitest 与 TypeScript、生产构建检查；启动 localhost:3001，API回读确认 JSON 数值一致，组件测试验证分类、弹窗与月份切换。浏览器安全策略拦截本地页访问，未绕过、未取得本次截图；已在验证报告注明限制。
