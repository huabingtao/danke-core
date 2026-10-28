# 2026年10月5.3版本图片资产导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 按用户批准的20列、28行、127条明细录入2026年10月，并交付疑项清单。

**Architecture:** 固定JSON保存人工识别结果及确认映射；一次性Prisma脚本验证、备份并在单个SQLite事务内导入。用副本验证幂等与回滚，最后通过真实API和后台核对。

**Tech Stack:** TypeScript、Prisma、better-sqlite3、现有SQLite数据库。

## Global Constraints
- 不修改八月104条记录，不运行旧4.9导入脚本，不改API或Schema。
- 空白不写零；核心18列为谐振芯片4，19列为特工核心5。
- 综合钥匙独立存储；载具核心仅建档，无图标和数量。
- 载具钥匙逐行合计142，原图114，保留差异而不改行值。
- 用户已明确要求实施，本轮直接执行；保留用户已有改动，不提交无关代码。

## Task 1: 保存识别原始资料
- [x] 建立 `docs/imports/2026-10-v5.3/source.png` 和 `data.json`；20列、28行、127条数量逐列合计校验。
- [x] 保存字段映射、补建道具、补建途径及待确认事项。

## Task 2: 事务导入
- [x] 建立 `scripts/import-2026-10-v5_3.ts`，默认仅预检，`--apply`执行；`--database`用于隔离验证。
- [x] 用SQLite在线备份保存到用户本机状态目录；单个Prisma事务内复用已有实体、补建两种道具和三个途径、按年月与两个外键upsert产出。
- [x] 相同值和备注不更新，保持重复执行时记录ID与时间戳稳定。
- [x] 事务内校验127条及所有列总数；保护其他月份与已有道具/途径字段。
- [x] 命令：`npx ts-node scripts/import-2026-10-v5_3.ts`（预检），增加`--apply`（导入）。

## Task 3: 验证与交付
- [x] 在真实数据库副本执行两次，比较完整记录不重复不漂移。
- [x] 在另一副本设置拒绝插入产出的SQLite触发器，确认新增道具、途径、产出全部回滚。
- [x] 对真实库导入，再比较八月104条原记录及其他既有实体。
- [x] API核对十月127条和合计；后台选择十月、检查新道具/途径并刷新验证。
- [x] 保存 `verification.json`、`report.md` 和后台截图，交付待确认清单。

