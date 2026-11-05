# Core API 契约清单（源码快照）

核对日期：2026-10-31。此清单描述当前 Controller 实际路由和装饰器，不代表所有 DTO 都已在运行时校验。当前 `main.ts` 未安装全局 `ValidationPipe`。JSON 返回结构由 Service/Prisma 决定的接口标为“源码未固定 DTO”；在制定统一响应格式前，应先通过只读响应样本补齐，不得据此直接改旧接口。

认证使用 `Authorization: Bearer <JWT>`。表中的权限为 Controller 上的服务端 `RequirePermission`；没有该装饰器表示此路由当前不要求该权限，并不等价于公开发布承诺。

| 方法 | URL | 参数 / 请求体 | 当前响应 | 服务端认证 / 权限 | 已知消费者 |
|---|---|---|---|---|---|
| POST | `/auth/login` | JSON: `username`, `password` | 登录结果及 access token；精确 DTO 未声明 | 无 JWT | Admin |
| GET | `/auth/profile` | Bearer JWT | 用户、权限、菜单树 | JWT | Admin |
| POST | `/auth/change-password` | Bearer JWT；JSON: `oldPassword`, `newPassword` | 修改结果 | JWT | Admin |
| GET | `/items` | 无 | Item 数组 | 无 | Admin；Web 使用情况未确认 |
| GET | `/items/:id` | path: `id` | 单个 Item | 无 | 未确认 |
| POST | `/items` | `CreateItemDto` | 创建后的 Item | JWT + `item:create` | Admin |
| PATCH | `/items/:id` | path: `id`；`UpdateItemDto` | 更新后的 Item | JWT + `item:create` | Admin |
| DELETE | `/items/:id` | path: `id` | 删除结果 | JWT + `item:delete` | Admin |
| GET | `/sources` | 无 | Source 数组 | 无 | Admin |
| GET | `/sources/:id` | path: `id` | 单个 Source | 无 | 未确认 |
| POST | `/sources` | `CreateSourceDto` | 创建后的 Source | JWT + `yield:edit` | Admin |
| PATCH | `/sources/:id` | path: `id`；`UpdateSourceDto` | 更新后的 Source | JWT + `yield:edit` | Admin |
| PUT | `/sources/:id` | path: `id`；`UpdateSourceDto` | 与 PATCH 兼容的更新 | JWT + `yield:edit` | 兼容别名；消费者未确认 |
| DELETE | `/sources/:id` | path: `id` | 删除结果 | JWT + `yield:edit` | Admin |
| GET | `/yields` | `QueryYieldDto` | Yield 数组/查询结果；未声明 DTO 响应 | 无 | Admin、Web |
| GET | `/yields/monthly-report` | query: `year`, `month` | 月报；结构由 Service 决定 | 无 | Web/Admin 使用情况需继续核实 |
| POST | `/yields` | `CreateYieldDto` | 创建或更新结果 | JWT + `yield:edit` | Admin |
| GET | `/menus` | 无 | Menu 数组 | 无 | Admin；Core 登录资料可能间接使用 |
| GET | `/menus/:id` | path: `id` | 单个 Menu | 无 | 未确认 |
| POST | `/menus` | `CreateMenuDto` | 创建后的 Menu | JWT + `menu:manage` | Admin |
| PATCH | `/menus/:id` | path: `id`；`UpdateMenuDto` | 更新后的 Menu | JWT + `menu:manage` | Admin |
| DELETE | `/menus/:id` | path: `id` | 删除结果 | JWT + `menu:manage` | Admin |
| GET | `/reminders` | query: `category`, `sortBy`, `order` | ReminderRule 数组 | 无 | Admin、日历/MCP 消费者 |
| GET | `/reminders/daily-digest` | query: `date` 可选 | 当日提醒摘要；由 Service 计算 | 无 | 日历/MCP 消费者 |
| GET | `/reminders/:id` | path: `id` | 单条规则 | 无 | 未确认 |
| POST | `/reminders` | `CreateReminderDto` | 创建后的规则 | JWT + `reminders:manage` | Admin |
| PATCH | `/reminders/:id` | path: `id`；`UpdateReminderDto` | 更新后的规则 | JWT + `reminders:manage` | Admin |
| PATCH | `/reminders/:id/toggle` | path: `id` | 更新后的规则 | JWT + `reminders:manage` | Admin |
| DELETE | `/reminders/:id` | path: `id` | 删除结果 | JWT + `reminders:manage` | Admin |
| GET | `/agents`, `/api/agents` | 无 | Agent 数组 | 无 | Web |
| GET | `/agents/:code`, `/api/agents/:code` | path: `code` | 单个 Agent | 无 | Web |
| POST | `/agents`, `/api/agents` | Agent DTO（Controller 内定义） | upsert 后的 Agent | JWT + `agent:manage` | Admin/导入流程待确认 |
| GET | `/strategies`, `/api/strategies` | query: `category` 可选 | Strategy 数组 | 无 | Web |
| GET | `/strategies/:slug`, `/api/strategies/:slug` | path: `slug` | 单篇 Strategy | 无 | Web |
| POST | `/strategies`, `/api/strategies` | Strategy DTO（Controller 内定义） | upsert 后的 Strategy | JWT + `strategy:manage` | Admin/导入流程待确认 |
| POST | `/strategies/sync`, `/api/strategies/sync` | JSON: `customPath` 可选 | 同步摘要 | JWT + `strategy:sync` | 运维/同步流程待确认 |
| GET | `/wiki/entries`, `/api/wiki/entries` | query: `category`, `subcategory`, `rarity`, `edition`, `tier`, `search`, `limit`, `offset` | WikiEntry 查询结果 | 无 | Web |
| GET | `/wiki/entries/:slug`, `/api/wiki/entries/:slug` | path: `slug` | 单个 WikiEntry | 无 | Web |
| GET | `/wiki/matrices`, `/api/wiki/matrices` | query: `category` 可选 | ProgressionMatrix 数组 | 无 | Web |
| GET | `/wiki/matrices/:code`, `/api/wiki/matrices/:code` | path: `code` | 单个 ProgressionMatrix | 无 | Web |
| GET | `/events` | 无 | GameEvent 数组 | JWT + `events:view` | Admin |
| POST | `/events` | `CreateEventDto` | 创建后的 GameEvent | JWT + `event:create` | Admin |
| PATCH | `/events/:id` | path: `id`；`UpdateEventDto` | 更新后的 GameEvent | JWT + `event:create` | Admin |
| DELETE | `/events/:id` | path: `id` | 删除结果；关联 Yield 的 eventId 按模型关系置空 | JWT + `event:delete` | Admin |
| GET | `/` | 无 | 健康/欢迎文本 | 无 | 人工探测；正式 health contract 未定义 |

## 兼容与后续契约任务

- `/agents` 与 `/api/agents`、`/strategies` 与 `/api/strategies`、`/wiki/*` 与 `/api/wiki/*` 是 Controller 显式路由别名；统一前先查访问日志和仓库调用点。
- `/sources/:id` 的 PUT 与 PATCH 暂时并存；不要删除 PUT，直到消费者清单确认无调用。
- 当前没有统一分页信封或统一错误 DTO；先记录现有返回样本，再新增兼容 DTO/适配，不原地改写响应结构。
- CORS 来源由 `CORS_ORIGINS` 环境变量设置；它是浏览器来源限制，不替代 API 权限。
- 所有敏感写路由都应保留 Controller 上的 JWT 与权限守卫。变更守卫时，对匿名、无权、有权、过期 Token 分别做 HTTP 集成验证。
- `GameEvent` API 当前没有新增或修改数据库模型；活动数据读取、创建、修改、删除走 Prisma/Core API。

## 2026-11-01 道具多分类及账号视图增量契约

- `GET /item-classifications`返回`{categories, resourceTypes}`，均为稳定`id/name/sortOrder`。
- Item保留原type；新增可空resourceTypeId、categoryIds（多选）、categories、resourceType。创建/更新省略分类字段时保留默认/已有值，[]和null分别明确清空分类和类型。
- `POST /item-classifications/bulk`接收`{itemIds, categoryIds?, resourceTypeId?}`，JWT+item:create，事务更新；不存在ID返回400且不部分写入。
- `GET/PUT /me/preferences/yield-matrix`仅JWT当前用户，PUT接收`{selectedItemIds}`，拒绝客户端owner字段。GET未保存为null，保存为空为[]；已删除ID读取时忽略。
- 来源更新原路径不变：名称trim，空值400，冲突409；原权限保留。
- SQLite旧库无迁移历史，当前通过带备份/事务/完整性校验的维护脚本应用单个增量SQL，不运行初始migration或reset。完整实施说明见Admin docs/classifications-and-account-columns.md。

## 2026-11-02 快捷游戏维度与分维度偏好

- `GET /item-classifications` 增量增加 `views`：`{id, name, categoryIds, resourceTypeId}`。稳定 ID 为 all/equipment/agent/tech/collection/vehicle/pet/keys/cores，按此顺序展示。categoryIds 非空时按任一体系匹配，resourceTypeId 非空时再按类型匹配。
- `GET /me/preferences/yield-matrix?viewId=agent`；PUT 接收 `{viewId?: string, selectedItemIds: string[]}`。省略 viewId 等同 all，继续读取旧 `yield-matrix`；其他维度使用 `yield-matrix:<viewId>`。无需表结构迁移。
- 只接受 JWT 当前账号，未知 viewId 返回 400。保存的每个道具必须存在且匹配目标维度，否则 400 且不写入；读取过滤已删除或不再匹配维度的道具，不删除历史产出和其他维度偏好。
- GET 未保存为 `{selectedItemIds:null}`，保存空选择为 `{selectedItemIds:[]}`。按真实 ID 区分记录，不按名称自动合并。
- 同一道具多体系只对应一个实体及既有产出；旧 Item.type、categoryIds/resourceTypeId 和所有写入权限继续兼容。正式库数据未在本任务中变更。

## 2026-11-02 一级多分类与钻石价值

- 分类新增 core/key，general/event 的显示名调整为其他/活动货币；顺序核心、装备、特工、宠物、配件、收藏品、载具、钥匙、其他、活动货币。categories/views 增量返回 icon。旧资源类型字典及字段保留，Admin 停止使用。
- cores/keys 旧 viewId 分别匹配 core/key 分类，其他视图 ID、账号偏好键及 GET/PUT 路径不变；新增 general/event 视图，不重置偏好。
- Item GET 响应新增 gemValuation；PATCH/POST 可接受 `{gemValuation:{prices:[{id,value}]}}`，JWT+item:create 不变。数字有限、非负、方案 ID 唯一；已有方案集合不可被替换或删除，未配置使用 default。
- 服务端事务内复用 stats._gemValuation，合并保护其他 stats；客户端不能经原始 stats 写该命名空间，也不能经价格 DTO 伪造来源及参考价。人工修改保留原 referenceValue、来源及标签，并标记 manuallyModified。
- 参考初始化使用有备份和报告的 Core 一次性脚本，缺省仅演练；不在启动/构建自动执行。无 DDL 或迁移，现有来源/产出/账号偏好均保留。

## 2026-11-02 确认别名归档与中文命名

- Item.stats._mergedInto标识确认别名的正式ID；只归档无产出的确认重复项，不删除Item记录。GET /items仅返回正式项，增量返回aliases（可搜索历史名称）、aliasIds（兼容排序）。
- GET/PATCH /items/:旧ID解析到正式项；POST旧别名名称不重建重复条目；DELETE旧ID返回409，避免使用缓存页面误删正式项。
- 显示列偏好GET/PUT和批量分类将别名ID归一，按正式ID去重。Yields写入与itemId查询同样归一，避免新增隐藏产出或破坏唯一槽位。
- 身份元数据保留字段不能由普通stats请求伪造，更新属性时保留原身份和估值元数据。原权限守卫及路径不变，没有DDL。
