# 访问渠道统计（Web 网页端 / 微信小程序端）

管理控制台「平台活跃度」看板按访问渠道统计 PV / UV。本文件记录字段链路、
采集口径与数据库迁移步骤。

## 1. 字段与取值

| 层 | 字段 | 取值 |
| --- | --- | --- |
| 采集请求 | `clientType` | `web` / `miniprogram`（缺省按 `web`） |
| 数据库 | `page_view_event.client_type` | `TEXT NOT NULL DEFAULT 'web'` |
| 聚合接口 | `channels[].clientType` | `web` / `miniprogram` |
| 每日明细 | `daily[].webPv` / `webUv` / `miniprogramPv` / `miniprogramUv` | 数字 |

服务端在 `PageViewConstants.normalizeClientType` 中统一 `trim` + 转小写，
只接受白名单值；其它值一律以 `20085`（页面浏览上报无效）拒绝，
不接受客户端自定义渠道名。

> **渠道不是安全边界**：它由采集端自报，客户端可以伪造，只用于统计分组，
> 不得用于鉴权、权限判断或任何业务放行逻辑。

## 2. 采集入口

### Web 网页端

- `amour-vue3/src/utils/pageViewTracker.js`：`createPageViewTracker` 在上报
  payload 中固定带 `clientType: 'web'`；
- `amour-vue3/src/router/index.js`：`router.afterEach` 中调用；
- 只统计白名单用户内容页；`/admin/**` 与 `/login` 不上报；
- 首次进入与有效路由切换各计一次，hash / query-only 变化与 2 秒内的重复导航去重；
- fire-and-forget，失败静默丢弃。

### 微信小程序端

- `amour-miniprogram/miniprogram/utils/page-view-tracker.ts`：访客 ID、事件 ID、
  页面键映射与去重逻辑；
- `amour-miniprogram/miniprogram/utils/page-view-lifecycle.ts`：把采集挂到
  小程序生命周期（`Page` 与“作为页面使用的 Component”两种形态）；
- `amour-miniprogram/miniprogram/api/analytics.ts`：复用 `utils/request` 的上报封装；
- `amour-miniprogram/miniprogram/app.ts`：注入上报实现（失败静默），
  并在 `onHide` 标记进入后台。

页面键映射（`app.json` 注册路径 → 统计键）：

| 页面路径 | pageKey |
| --- | --- |
| `pages/index/index` | `home` |
| `pages/plaza/index` | `plaza` |
| `pages/plaza-detail/index` | `plaza_detail` |
| `pages/story/story` | `story` |
| `pages/story-detail/story-detail` | `story_detail` |
| `pages/photo/photo` | `photo` |
| `pages/photo-detail/photo-detail` | `photo_detail` |
| `pages/message/message` | `message` |
| `pages/profile/profile` | `profile` |

登录页、`profile-edit`、`logs`、错误页等不在映射表中，因此不会被统计。

## 3. 统计口径

- **PV**：打开或刷新一个受统计的用户内容页面计 1 次；不按接口请求计数；
- **UV**：整段区间内按 `visitor_key` 去重。合计 UV 与每个渠道的 UV 各自独立整段去重，
  因此合计 UV ≠ 各渠道 UV 之和（同一访客可能同时访问两端）；
- **来源浏览次数占比**：`该来源区间 PV ÷ 合计 PV`；总量为 0 时接口返回 `null`，
  前端显示“—”。**访客人数不计算占比**：它是去重集合，同一访客可能同时出现在两端，
  两个来源的访客人数不能相加，各来源占比之和也不具有 100% 的含义；
  `uvShare` 字段仍由接口保留，但看板不展示；
- **环比**：与紧邻当前区间之前的等长区间对比；上一周期为 0 时返回 `null`；
- 时间按 `Asia/Shanghai` 切分，以服务端接收时间为准，区间最长 90 天，事件保留 400 天；
- 仅按页面白名单和基础频控过滤明显机器人，不宣称完全识别机器人。

### 前端数据看板（/admin/dashboard「访问情况」）

管理控制台工作台的访问图表由以下文件实现：

| 文件 | 职责 |
| --- | --- |
| `components/admin/AdminActivityPanel.vue` | 「访问情况」区域：日期筛选、核心数字、趋势与来源布局、数据说明 |
| `components/admin/AdminActivityChartCanvas.vue` | ECharts 画布容器：加载/刷新/空/失败/渲染失败状态、读屏等价表格 |
| `components/admin/AdminActivityChannelPanel.vue` | 「访问来源」来源明细与横向条形图 |
| `components/admin/AdminActivityDailyGrid.vue` | 每日明细表格（默认收起、每页最多 7 天） |
| `utils/activityChart.js` | 数据适配 + 趋势折线 / 每日对比 / 来源条形图的 option 生成 |
| `utils/activityChartHost.js` | ECharts 实例生命周期（懒初始化、resize、dispose） |
| `utils/activityChartEcharts.js` | 按需注册 ECharts 模块（动态 import，独立 chunk） |
| `utils/activityCopy.js` | 面向管理员的文案与数字格式（浏览次数 / 访客人数 / 比上一时段） |
| `utils/activityChannels.js` | 来源口径（web / miniprogram → 网页端 / 微信小程序） |

| 关注点 | 实现 |
| --- | --- |
| 图表库 | ECharts 6 按需引入 `LineChart` + `BarChart` + Grid/Tooltip/Legend/Aria/DataZoom + `CanvasRenderer`，不引入饼图 |
| 加载方式 | `activityChartEcharts.js` 动态 `import`，图表 chunk 只在管理员打开工作台时加载 |
| 来源颜色 | 网页端 `#e11d48`（玫瑰红）、微信小程序 `#0ea5e9`（天蓝），全页面一致；全部来源用中性灰 `#64748b` 虚线 |
| 指标切换 | 「浏览次数 / 访客人数」纯前端切换，两个图表共用，不重新请求接口 |
| 图表形式 | 「趋势」（折线）/「每日对比」（分组柱，不堆叠），纯前端切换 |
| 日期较多 | 超过 31 天自动启用 dataZoom（默认聚焦最近 31 天） |
| 坐标轴 | 计数轴从 0 开始；千位以上用「万」（`1.2万`），不使用 k / w |
| 可访问性 | `aria` 描述 + 视觉隐藏的等价文字表格（`sr-only`）+ 键盘可操作的分段控件 |
| 减少动态效果 | `prefers-reduced-motion: reduce` 时图表 `animation: false` |
| 失败降级 | ECharts 初始化失败时展示通俗提示与同样的数字明细，不输出原始异常堆栈 |

界面文案约定（`activityCopy.js`）：

- `PV → 浏览次数`、`UV → 访客人数`、`Web 网页端 → 网页端`、`微信小程序端 → 微信小程序`；
- `渠道 → 访问来源`、`区间汇总 → 所选时间合计`、`环比 → 比上一时段`；
- `Asia/Shanghai → 北京时间`；
- 上一时段为 0 显示「上一时段暂无访问」；对比数据缺失显示「暂无对比数据」。

数据适配约定（`normalizeActivityChartData`）：

1. 优先读取 `daily[].webPv/webUv/miniprogramPv/miniprogramUv`；
2. 分渠道每日数据只在 `channels[].daily` 时也能绘制；
3. **老接口**只有 `pv/uv/daily` 时返回 `status=unavailable`，明确提示「来源明细暂不可用」，
   绝不把合计值拆分成来源；
4. 来源合计取 `channels[]`，浏览次数缺失时可由每日数据相加，**访客人数只认接口整段去重值**；
5. 缺失字段保持 `null`（界面显示「—」），真实 `0` 保持 `0`，两者不混用；
6. 日期严格保持服务端返回顺序；
7. 所选时间内的访客人数只读 `totalUv`；区间合计不把每日访客人数相加，
   全部来源访客人数也不由两个来源相加（同一访客可能同时出现在两端）；
8. 浏览次数占比只在来源与合计都完整有效时计算，并明确标注「浏览次数占比」；
   访客人数不计算占比。

前端状态机（`composables/useActivityDashboard.js`）：

- 请求序号丢弃过期响应，快速切换日期时旧响应不污染界面；
- **切换日期**时立即清空旧数据，失败后所有区域一起显示失败状态，不保留旧日期的数字；
- **同日期刷新**保留旧内容并提示「更新中」，刷新失败时标注「正在显示上次成功结果」；
- 指标与图表形式切换不触发请求；
- `summary` 与 `activity` 的加载失败各自处理，互不遮挡。

## 4. 数据库迁移

迁移脚本位于 `amour-springboot/amour-web/src/main/resources/db/migrations/`，
应用启动时**不会**自动执行。

### SQLite（本地开发 / 单机部署）

```bash
cd amour-springboot
# 先备份
sqlite3 db/amour.db ".backup 'amour-backup-before-client-type.db'"
# 执行迁移（重复执行时第二次会在 ADD COLUMN 处报 duplicate column，
# 该语句在索引创建之前，不会破坏数据）
sqlite3 db/amour.db < amour-web/src/main/resources/db/migrations/20261117_page_view_client_type_sqlite.sql
# 校验
sqlite3 db/amour.db "PRAGMA table_info(page_view_event);"
sqlite3 db/amour.db "SELECT client_type, COUNT(*) FROM page_view_event GROUP BY client_type;"
```

### MySQL（生产）

```bash
mysqldump -h <host> -u <user> -p amour page_view_event > page_view_event_before_client_type.sql
mysql -h <host> -u <user> -p amour \
  < amour-springboot/amour-web/src/main/resources/db/migrations/20261117_page_view_client_type_mysql.sql
```

MySQL 脚本通过 `information_schema` 判断列 / 索引是否存在，**可重复执行**。

### 新增内容

- 列 `client_type`（默认 `'web'`，历史行自动归类 Web）；
- 索引 `idx_page_view_date_client_visitor (view_date, client_type, visitor_key)`；
- 索引 `idx_page_view_date_client_page (view_date, client_type, page_key)`。

旧索引 `(view_date, visitor_key)`、`(view_date, page_key)` 保留，
用于“全渠道合计”查询，不重复创建同类索引。

## 5. 生产发布顺序

1. 备份 `page_view_event`（必须）；
2. 执行数据库迁移（先 MySQL / SQLite，再发布应用）；
3. 发布后端（`amour-web` 含 `amour-common` / `amour-admin`）；
4. 发布 Web 前端（`npm run build` 后发布 `dist`）；
5. 发布小程序（微信开发者工具上传 → 提审 → 发布）；
6. 在小程序正式版生效前，小程序渠道数据为 0 属于正常现象，看板仍会展示该渠道。

迁移与应用的兼容性：新代码兼容没有 `client_type` 的旧表（聚合 SQL 会兜底为 `web`），
但**写入**需要该列存在（`NOT NULL` 约束），因此建议先迁移再发布。
