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
├── utils/session-constants.js   # 状态 / Tab / 页面权限常量
├── utils/session-rules.js       # 状态推导、Tab 过滤、页面级别（纯函数，有单测）
├── utils/session-state.js       # 唯一用户状态源（登录态 + 情侣空间状态）
├── utils/access-control.js      # 路由守卫与导航拦截
├── utils/space-api.js           # 情侣空间接口封装
├── components/
│   ├── space-card/           # 公开空间卡片 + 骨架
│   ├── avatar/               # 头像与失败回退
│   ├── empty-state/          # 空状态 / 失败提示
│   ├── list-footer/          # 加载更多 / 失败重试 / 已到底
│   ├── navigation-bar/       # 既有自定义导航栏
│   └── bottom-nav/           # 唯一一套底部导航
├── pages/
│   ├── plaza/                # 恋爱广场列表
│   ├── plaza-detail/         # 公开空间详情承接页
│   ├── login/                # 登录页（未登录访问受限页时的落点）
│   └── space-setup/          # 创建情侣空间 / 绑定加入
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
  - `POST /gallery/space/story/detail` `{ spaceId, storyId }` → `GalleryStoryDetailVO`
- 只使用后端公开只读接口返回的字段，不补充成员资料、不读取待审核快照。
- 图片只接受 `http(s)` 绝对地址；相对路径与空值一律走占位，避免破图。
- 分页去重按 `spaceId`；刷新与分页并发时旧响应会被丢弃；卸载后忽略在途响应。

### 公开内容详情（故事 / 照片）

| 页面 | 路由 | 数据来源 | 访问级别 |
| --- | --- | --- | --- |
| 公开空间 | `pages/plaza-detail/index` | `POST /gallery/space/detail` | `public` |
| 公开故事详情 | `pages/plaza-story/plaza-story` | `POST /gallery/space/story/detail` | `public` |
| 公开照片详情 | `pages/plaza-photo/plaza-photo` | `POST /gallery/space/detail` 后按 `photoId` 精确匹配 | `public` |

- 列表项**整块**是点击区域：故事整行、照片整格都可点，不是只有标题或图片可点。
- 导航只携带 `spaceId + storyId / photoId`，**不传列表下标**：
  详情页进入后按 ID 重新拉取数据，列表排序、分页或缓存变化都不会打开错误内容。
- 公开故事详情复用私有故事详情的正文渲染语义（`utils/story-content` 统一解析 Markdown），
  但走独立的公开接口，不要求登录态 / 情侣空间 / 私有模块权限。
- 照片没有独立公开详情接口，复用空间详情返回的公开照片列表：
  只要 `photoId` 仍在该空间的公开照片内就能定位；照片被删除、改为私密或属于其它空间时
  展示“不可见”空状态，不回退到私有相册接口。
- 隐私拦截仍由后端完成：私密故事 / 照片不会进入公开快照，公开详情接口按快照查找，
  前端不放大任何权限，私有详情页（`pages/story-detail`、`pages/photo-detail`）仍是 `space` 级别。
- 详情页返回优先 `navigateBack`，保留公开空间页的列表与滚动位置；
  从分享 / 扫码直达（页面栈只有一层）时按路由里的 `spaceId` 重建公开空间页。
- 公开详情页的页面浏览统计复用 `story_detail` / `photo_detail` 页键，不新增后端白名单之外的键。

## 情侣空间销毁（创建者）

创建者可以在**另一半尚未加入**时销毁并清空自己的情侣空间：

- 入口：`pages/space-setup/index` 的「销毁并清空空间」卡片，只对
  「当前用户是创建者 + 另一半尚未加入」展示（`canShowDestroyEntry`）；
- 二次确认：先说明「空间与内容对双方都不可见、用户侧不能自行恢复、只有管理员可以协助恢复」，
  再要求逐字输入「销毁」；提交期间按钮 loading 且禁用；
- 成功后以服务器 `POST /space/status` 为准（返回 `data=null`），再清理空间相关本地缓存
  （`photoDetailCollection` 等）并 `reLaunch` 到恋爱广场，避免返回键回到旧页面；
- 服务端拒绝（例如另一半已加入，`20094`）时保留当前页面、提示可理解信息并强制刷新状态，
  不依赖入口隐藏来保证安全；
- 重复点击 / 网络重试由后端幂等处理（已销毁时返回同一份结果，`destroyed=false`）。

对应接口只有 `POST /space/destroy`（无请求体，身份与空间由服务端推导）；
销毁后 `status=6`，普通用户侧不再视为「有情侣空间」，底部导航回到两个 Tab。

## 登录态与情侣空间状态控制

小程序端只有**一份**用户状态来源：`utils/session-state.js`。
Tab 展示、页面权限、路由跳转全部由它推导，页面不再各自判断。

### 状态模型

| 状态 | 含义 | 底部 Tab |
| --- | --- | --- |
| `loading` | 正在恢复登录态 / 查询情侣空间状态 | 骨架占位，不渲染真实 Tab |
| `unauthenticated` | 未登录 | 恋爱广场 + 我的 |
| `authenticated_without_space` | 已登录但未创建 / 绑定 / 加入情侣空间 | 恋爱广场 + 我的 |
| `authenticated_with_space` | 已登录且存在情侣空间 | 完整 Tab |
| `error` | 情侣空间状态查询失败（安全降级） | 恋爱广场 + 我的，我的页提供重试 |

情侣空间状态**只**通过后端 `POST /space/status` 判断（`data=null` 表示没有空间），
不在本地猜测。状态确认前不会短暂展示完整 Tab。

### 模块职责

```
utils/session-constants.js   状态 / Tab / 页面权限常量（唯一常量来源）
utils/session-rules.js       纯规则：状态推导、Tab 过滤、页面级别、拦截目标
utils/session-state.js       唯一状态源：恢复登录、刷新空间状态、请求序号防竞态
utils/access-control.js      路由守卫：页面守卫、导航拦截、全局状态变化拦截
utils/space-api.js           情侣空间接口（复用 /space/status、/space/create、邀请相关）
```

### Tab 与页面权限

- Tab 定义集中在 `session-constants.js` 的 `TAB_DEFINITIONS`，`bottom-nav` 只渲染状态允许的 Tab。
- 页面访问级别在 `session-rules.js` 的 `PAGE_ACCESS_BY_ROUTE` 声明：
  - `public`：恋爱广场、广场详情、我的、登录页；
  - `auth`：资料编辑、情侣空间创建 / 绑定；
  - `space`：情侣空间首页、故事、相册、留言及其详情页。
- **只隐藏 Tab 不够**：受限页面在 `onLoad` / `attached` 走 `guardPageReady()`，
  深链、分享、扫码、历史栈、Tab 点击全部受控，拦截后 `reLaunch` 到「我的」并提示创建 / 绑定。
- `app.ts` 启动时绑定 `bindSessionNavigationGuard()`：停留期间 token 失效 / 退出登录会立即把受限页面赶回「我的」。

### 页面访问级别表必须与 `app.json` 同步

新增页面时要在 `PAGE_ACCESS_BY_ROUTE` 里声明级别，否则默认按 `auth` 处理。
`tests/acceptance.test.mjs` 会校验两者的双向一致性。

### 关键流程

- **启动**：恢复本地凭证 → 校验登录 → 查询 `/space/status`；确认前状态为 `loading`。
- **登录成功**：保存会话 → 重新查询空间状态 → 按结果更新 Tab（`notifyLoginSuccess` / `loginSession`）。
- **退出登录**：清登录缓存 + 空间缓存 + 页面数据 → 立即切两个 Tab → `reLaunch` 重建页面栈。
- **创建 / 绑定成功**：`refreshAfterSpaceChange()` 强制刷新（丢弃写操作前的在途响应），无需重启即可恢复完整 Tab。
- **Token 失效**：请求层 401 / 20002 清理登录态并通知 `session-state`，收敛为未登录。

### 与旧入口的对应关系

| 入口 | 路由 | 说明 |
| --- | --- | --- |
| 底部导航「首页」 | `pages/index/index` | 原有情侣空间首页，路由未变；现在需要情侣空间才可访问 |
| 底部导航「广场」 | `pages/plaza/index` | 公开浏览入口，匿名可访问 |
| 底部导航「故事 / 相册 / 留言 / 我的」 | 原路由 | 前三个需要情侣空间 + 模块查询权限；「我的」始终公开 |
| 登录页（新增） | `pages/login/login` | 未登录访问受限页时的落点，登录成功后按状态回跳 |
| 创建 / 绑定页（新增） | `pages/space-setup/index` | 创建情侣空间、绑定 / 加入情侣空间 |
