# amour-miniprogram

微信小程序端（原生框架 + TypeScript + LESS），使用微信开发者工具内置的
`typescript` / `less` 编译插件，不需要额外构建步骤。

## 本地检查

```bash
npm install          # 仅开发依赖：typescript / less / miniprogram-api-typings
npm run typecheck    # tsc -p tsconfig.json --noEmit
npm test             # node:test，覆盖适配层 / 分页状态机 / 页面行为
npm run check        # 静态校验：页面注册、组件引用、WXML 闭合、事件处理函数
npm run dev:host     # 换 Wi-Fi 后重新探测局域网 IP，写入接口配置
npm run preview      # 可选：把广场样式渲染成 HTML/PNG（输出 /tmp/amour-plaza-preview）
```

## 本地后端联调（重要）

开发版接口地址在 `miniprogram/utils/api-config.js`：

```js
const DEV_API_BASE_URLS = [
  'http://192.168.7.91:8080',  // 局域网 IP，优先
  'http://127.0.0.1:8080',     // 回环地址，兜底
]
```

**为什么不用 127.0.0.1**：微信小程序官方限制「不允许与本机 IP 通信」；同时开发者工具
默认「代理 = 系统代理」，代理软件会把 `127.0.0.1` 当成远端域名再转发一次，
表现为请求挂 10 秒后 `request:fail timeout` —— 但命令行 `curl 127.0.0.1:8080`
是秒回的，很容易误判成后端没起来。

换网络后跑 `npm run dev:host` 会自动探测并写回当前局域网 IP。临时改地址也可以在小程序里执行：

```js
wx.setStorageSync('apiBaseUrl', 'http://10.0.0.9:8080')  // 清空用 wx.removeStorageSync('apiBaseUrl')
```

请求层会自动按候选地址顺序重试：只有**连接失败**才切换地址，拿到 HTTP 响应（含 4xx/5xx）
就交给业务处理，不会把一次业务错误重试成三次。开发版超时 5s、正式版 10s。

测试直接导入 `miniprogram/**/*.ts` 源码，依赖 Node 的类型剥离能力，
需要 **Node ≥ 22.15**（推荐 22.18+ LTS）。`tests/support/resolve-hooks.mjs`
只补齐 TS 源码里省略扩展名的相对导入，不改变小程序运行时代码。

`npm run preview` 会把真实的 LESS 编译产物按 750rpx = 375px 换算后渲染成
HTML 并（在有 Chrome 时）截图，用于快速检查排版；它不属于产品代码。

## 目录

```
miniprogram/
├── api/plaza.ts              # 恋爱广场公开接口（只调用 /gallery/**）
├── api/analytics.ts          # 页面浏览上报（复用 utils/request，失败静默）
├── utils/page-view-tracker.ts   # 访客 ID / 事件 ID / 页面键映射 / 去重
├── utils/page-view-lifecycle.ts # 生命周期接入（Page 与 Component 两种页面形态）
├── types/plaza.ts            # 接口结构与页面展示模型
├── utils/plaza-adapter.ts    # 接口 → 展示模型（日期、图片、可选字段、统计）
├── utils/plaza-pager.ts      # 列表状态机（分页 / 竞态 / 去重 / 卸载）
├── utils/plaza-error.ts      # 错误语义（可重试 / 空间不可见 / 网络失败）
├── components/
│   ├── space-card/           # 公开空间卡片 + 骨架
│   ├── avatar/               # 头像与失败回退
│   ├── empty-state/          # 空状态 / 失败提示
│   ├── list-footer/          # 加载更多 / 失败重试 / 已到底
│   ├── navigation-bar/       # 既有自定义导航栏
│   └── bottom-nav/           # 唯一一套底部导航
├── pages/
│   ├── plaza/                # 恋爱广场列表
│   └── plaza-detail/         # 公开空间详情承接页
└── styles/tokens.less        # 颜色 / 间距 / 圆角 / 字号变量
```

## 页面浏览统计

小程序端上报的页面浏览事件用于管理控制台「平台活跃度」的**微信小程序端** PV / UV。

- 渠道固定上报 `clientType: 'miniprogram'`；服务端只接受 `web` / `miniprogram` 白名单值。
  渠道是客户端自报的统计维度，**不作为鉴权或权限判断依据**。
- 计数口径与 Web 端一致：页面首次展示计一次；同一实例重复 `onShow`（包括从后台返回）
  不重复计数；真正切换到新页面或重新进入页面才计数；不按接口请求计数。
- 游客访客 ID 保存在小程序本地存储（`amour_pv_visitor_id`，32 位十六进制，180 天轮换），
  与后端校验规则一致。
- 上报失败静默丢弃，不阻塞页面，也不弹提示。
- 覆盖页面：首页、恋爱广场、公开空间详情、故事列表 / 详情、相册列表 / 详情、
  留言板、个人中心。登录页、资料编辑、日志与错误页不统计。
- 详细统计口径与数据库迁移见仓库根目录 `docs/analytics-client-type.md`。

## 恋爱广场

- 入口：`pages/plaza/index`，底部导航「广场」直接进入，**匿名可浏览**，不触发微信登录。
- 接口：
  - `POST /gallery/spaces` `{ current, size }` → `PageResult<GallerySpaceCardVO>`
  - `POST /gallery/space/detail` `{ spaceId }` → `GallerySpaceDetailVO`
- 只使用后端公开只读接口返回的字段，不补充成员资料、不读取待审核快照。
- 图片只接受 `http(s)` 绝对地址；相对路径与空值一律走占位，避免破图。
- 分页去重按 `spaceId`；刷新与分页并发时旧响应会被丢弃；卸载后忽略在途响应。

## 与旧入口的对应关系

| 入口 | 路由 | 说明 |
| --- | --- | --- |
| 底部导航「我的空间」 | `pages/index/index` | 原有情侣空间首页，路由未变 |
| 底部导航「广场」（新增） | `pages/plaza/index` | 新增公开浏览入口 |
| 底部导航「故事 / 相册 / 留言 / 我的」 | 原路由 | 保持不变，权限逻辑不变 |
