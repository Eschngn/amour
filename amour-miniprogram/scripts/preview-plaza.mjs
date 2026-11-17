/**
 * 恋爱广场视觉预览（仅本地开发使用，不参与小程序打包）。
 *
 * 由于 rpx 在浏览器中无意义，这里按 750rpx = 375px 的比例把 LESS 编译产物
 * 转换成 px，用近似 DOM 还原页面结构并截图，便于检查排版。
 *
 * 用法：node scripts/preview-plaza.mjs [输出目录]（默认 /tmp/amour-plaza-preview）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(process.argv[2] || '/tmp/amour-plaza-preview')
const require = createRequire(import.meta.url)

/** 找到可用的 less 编译器：优先项目依赖，其次微信开发者工具内置版本。 */
function findLess() {
  const candidates = [
    join(ROOT, 'node_modules/less'),
    '/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/less',
  ]
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'package.json'))) return require(candidate)
  }
  throw new Error('未找到 less 编译器，请先 npm i -D less 或安装微信开发者工具')
}

const less = findLess()

function rpxToPx(css) {
  return css.replace(/(-?\d*\.?\d+)rpx/g, (_, value) => `${Number(value) * 0.5}px`)
}

async function compile(relativePath) {
  const file = join(ROOT, 'miniprogram', relativePath)
  const { css } = await less.render(readFileSync(file, 'utf8'), { filename: file })
  return rpxToPx(css)
}

const card = {
  spaceId: '2001',
  spaceName: '橙子与子怡的四季',
  memberSummary: '橙留香 · 子怡',
  description: '记录我们认真生活的每一天。周末的早餐、夏天傍晚的散步，还有所有不值得发朋友圈但想起会笑的小事。',
  coverUrl: '',
  togetherDays: '相伴 736 天',
  startDateText: '始于 2024.05.20',
  stats: [
    { key: 'story', label: '公开故事', value: '12' },
    { key: 'photo', label: '公开照片', value: '36' },
    { key: 'anniversary', label: '公开纪念日', value: '4' },
  ],
  recentText: '最近更新 · 第一次一起看电影',
  members: [
    { key: 'm0', name: '橙留香', initial: '橙', avatarUrl: '' },
    { key: 'm1', name: '子怡', initial: '子', avatarUrl: '' },
  ],
  ariaLabel: '查看橙子与子怡的四季的公开空间',
}

const longCard = {
  spaceId: '2002',
  spaceName: '这是一个特别长的空间名称用来验证两行截断与卡片高度是否稳定不会撑破布局',
  description: '我们一起去过很多地方，也把很多普通的周末过成了值得记住的日子。'.repeat(6),
  coverUrl: '',
  togetherDays: '今天开始',
  startDateText: '始于 2026.05.26',
  stats: [{ key: 'story', label: '公开故事', value: '1' }],
  recentText: '',
  members: [{ key: 'm0', name: 'Alexandra Konstantinova', initial: 'AK', avatarUrl: '' }],
  ariaLabel: '查看长名称空间',
}

const skeleton = { spaceId: '', spaceName: '', members: [], stats: [], ariaLabel: '' }

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderAvatar(member, size) {
  const cls = size === 'small' ? ' is-small' : ''
  if (member.avatarUrl) {
    return `<span class="space-avatar${cls}"><img class="avatar-image" src="${escapeHtml(member.avatarUrl)}" alt=""></span>`
  }
  if (member.initial) {
    return `<span class="space-avatar${cls}"><span class="avatar-initial">${escapeHtml(member.initial)}</span></span>`
  }
  return `<span class="space-avatar${cls}"><span class="avatar-fallback-mark">♥</span></span>`
}

function renderCard(data, { isSkeleton = false } = {}) {
  if (isSkeleton) {
    return `<div class="space-card is-skeleton">
      <div class="cover"><div class="skeleton-block skeleton-cover"></div></div>
      <div class="card-body">
        <div class="skeleton-block skeleton-title"></div>
        <div class="skeleton-block skeleton-members"></div>
        <div class="skeleton-block skeleton-line"></div>
        <div class="skeleton-block skeleton-line short"></div>
        <div class="skeleton-footer">
          <div class="skeleton-block skeleton-chip"></div>
          <div class="skeleton-block skeleton-chip small"></div>
        </div>
      </div>
    </div>`
  }
  const members = data.members.map(member => `
    <div class="member">
      ${renderAvatar(member, 'small')}
      ${member.name ? `<span class="member-name">${escapeHtml(member.name)}</span>` : ''}
    </div>`).join('')
  const stats = data.stats.map((stat, index) => `
    ${index > 0 ? '<span class="stat-divider">·</span>' : ''}
    <span class="stat-item">${escapeHtml(stat.label)} <span class="stat-value">${escapeHtml(stat.value)}</span></span>`).join('')
  return `<div class="space-card">
    <div class="cover">
      <div class="cover-placeholder"><span class="placeholder-heart">♥</span><span class="placeholder-text">LOVE SPACE</span></div>
      ${data.togetherDays ? `<div class="cover-badge"><span class="badge-text">${escapeHtml(data.togetherDays)}</span></div>` : ''}
    </div>
    <div class="card-body">
      <div class="title-row">
        <span class="space-name">${escapeHtml(data.spaceName)}</span>
        ${data.startDateText ? `<span class="start-date">${escapeHtml(data.startDateText)}</span>` : ''}
      </div>
      ${members ? `<div class="member-row">${members}</div>` : ''}
      ${data.description ? `<span class="description">${escapeHtml(data.description)}</span>` : ''}
      ${data.recentText ? `<span class="recent-text">${escapeHtml(data.recentText)}</span>` : ''}
      ${stats ? `<div class="stat-row">${stats}</div>` : ''}
      <div class="card-footer"><span class="entry-hint">进入这个空间</span><span class="entry-arrow">→</span></div>
    </div>
  </div>`
}

const emptyState = `<div class="empty-state">
  <div class="state-icon"><span>♡</span></div>
  <span class="state-title">这里的心动故事，正在慢慢发生。</span>
  <span class="state-description">还没有人公开自己的情侣空间，晚一点再来看看吧。</span>
  <div class="state-actions"><div class="state-action"><span>刷新看看</span></div></div>
</div>`

const footer = `<div class="list-footer"><div class="footer-more"><span>加载更多公开空间</span><span class="more-arrow">↓</span></div></div>`

const bottomNav = `<div class="bottom-nav"><div class="nav-bar">
  <div class="nav-side nav-side-left">
    <div class="nav-item is-active"><span class="nav-icon plaza-icon"><span class="plaza-ring"></span><span class="plaza-ring plaza-ring-second"></span></span><span class="nav-label">广场</span></div>
    <div class="nav-item"><span class="nav-icon story-icon">✦</span><span class="nav-label">故事</span></div>
    <div class="nav-item"><span class="nav-icon photo-icon">▣</span><span class="nav-label">相册</span></div>
  </div>
  <div class="nav-item home-item"><div class="home-logo"></div><span class="nav-label home-label">我的空间</span></div>
  <div class="nav-side nav-side-right">
    <div class="nav-item"><span class="nav-icon message-icon">♡</span><span class="nav-label">留言</span></div>
    <div class="nav-item"><span class="icon profile-icon"><span class="profile-head"></span><span class="profile-body"></span></span><span class="nav-label">我的</span></div>
  </div>
</div></div>`

function page({ title, body, withFooter = false }) {
  return `<div class="page-scroll"><div class="plaza-page">
    <div class="plaza-intro">
      <div class="intro-heading"><span class="intro-kicker">LOVE PLAZA</span><span class="intro-count">${title}</span></div>
      <span class="intro-title">看看别人的心动日常</span>
      <span class="intro-copy">这里只展示大家主动公开的故事、照片与纪念日，浏览不会加入对方的空间。</span>
    </div>
    <div class="plaza-list">${body}</div>
    ${withFooter ? `<div class="plaza-footer">${footer}</div>` : ''}
    <div class="safe-bottom"></div>
  </div></div>`
}

const NAV_CSS = `
.nav-shell { height: 44px; display: flex; align-items: center; padding: 0 16px; background: #fdf9f6; color: #3b2c30; font-weight: 600; font-size: 17px; }
.nav-shell .nav-back { margin-right: 4px; font-size: 24px; line-height: 1; color: #3b2c30; }
.nav-shell .capsule { margin-left: auto; width: 87px; height: 32px; border-radius: 16px; border: 0.5px solid #e3d7d2; background: rgba(255,255,255,.65); }
`

const baseCss = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fdf9f6; }
body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", sans-serif; color: #3b2c30; }
.phone { width: 375px; min-height: 812px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.scroll-body { flex: 1; overflow: hidden; }
.safe-bottom { height: 24px; }
`

const detailView = {
  spaceId: '2001',
  spaceName: '橙子与子怡的四季',
  memberSummary: '橙留香 · 上官子怡',
  description: '把每一个普通日子，都写成我们共同的故事。',
  members: [
    { key: 'm0', name: '橙留香', initial: '橙', avatarUrl: '' },
    { key: 'm1', name: '上官子怡', initial: '上', avatarUrl: '' },
  ],
  togetherDays: '相伴 910 天',
  startDateText: '始于 2024.05.20',
  stats: [
    { key: 'story', label: '公开故事', value: '2' },
    { key: 'photo', label: '公开照片', value: '2' },
    { key: 'anniversary', label: '公开纪念日', value: '2' },
  ],
  stories: [
    { storyId: '8001', title: '第一次见面', dateText: '2024.05.20', location: '杭州', tagLabel: '初见', summary: '我们第一次见面，聊了很多关于未来和旅行的话题。' },
    { storyId: '8002', title: '第一次一起看电影', dateText: '2024.06.08', location: '', tagLabel: '约会', summary: '散场以后，我们又在街边聊了一个小时。' },
  ],
  photos: [
    { photoId: '11001', title: '周末早餐', url: '' },
    { photoId: '11002', title: '湖边散步', url: '' },
    { photoId: '11003', title: '夏日', url: '' },
  ],
  anniversaries: [
    { anniversaryId: '12001', title: '在一起一周年', dateText: '2025.05.20', location: '江边步道' },
    { anniversaryId: '12002', title: '第一次旅行纪念日', dateText: '2024.10.03', location: '苏州' },
  ],
}

function renderDetail(view) {
  const members = view.members.map(member => `
    <div class="member">${renderAvatar(member, 'large')}${member.name ? `<span class="member-name">${escapeHtml(member.name)}</span>` : ''}</div>`).join('')
  const stats = view.stats.map(stat => `<div class="stat-item"><span class="stat-value">${escapeHtml(stat.value)}</span><span class="stat-label">${escapeHtml(stat.label)}</span></div>`).join('')
  const stories = view.stories.map(story => `
    <div class="story-item">
      <span class="story-title">${escapeHtml(story.title)}</span>
      <div class="story-meta">
        ${story.tagLabel ? `<span class="story-tag">${escapeHtml(story.tagLabel)}</span>` : ''}
        ${story.dateText ? `<span class="story-meta-text">${escapeHtml(story.dateText)}</span>` : ''}
        ${story.location ? `<span class="story-meta-text">· ${escapeHtml(story.location)}</span>` : ''}
      </div>
      ${story.summary ? `<span class="story-summary">${escapeHtml(story.summary)}</span>` : ''}
    </div>`).join('')
  const photos = view.photos.map(photo => `
    <div class="photo-item">
      <div class="photo-frame"><div class="photo-fallback"><span class="photo-fallback-mark">♡</span></div></div>
      ${photo.title ? `<span class="photo-title">${escapeHtml(photo.title)}</span>` : ''}
    </div>`).join('')
  const anniversaries = view.anniversaries.map(item => `
    <div class="anniversary-item">
      <span class="anniversary-title">${escapeHtml(item.title)}</span>
      <div class="anniversary-meta">${escapeHtml(item.dateText)}${item.location ? ` · ${escapeHtml(item.location)}` : ''}</div>
    </div>`).join('')

  return `<div class="detail-page">
    <div class="hero-card">
      <div class="hero-cover"><div class="hero-cover-placeholder"><span class="placeholder-heart">♥</span><span class="placeholder-text">LOVE SPACE</span></div></div>
      <div class="hero-body">
        <div class="member-row">${members}</div>
        <span class="space-name">${escapeHtml(view.spaceName)}</span>
        <div class="meta-row"><span class="meta-pill">${escapeHtml(view.togetherDays)}</span><span class="meta-text">${escapeHtml(view.startDateText)}</span></div>
        <span class="description">${escapeHtml(view.description)}</span>
        <div class="stat-row">${stats}</div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-heading"><span class="section-title">公开故事</span><span class="section-meta">${view.stories.length} 篇</span></div>
      <div class="story-list">${stories}</div>
    </div>
    <div class="section-card">
      <div class="section-heading"><span class="section-title">公开照片</span><span class="section-meta">${view.photos.length} 张</span></div>
      <div class="photo-grid">${photos}</div>
    </div>
    <div class="section-card">
      <div class="section-heading"><span class="section-title">公开纪念日</span><span class="section-meta">${view.anniversaries.length} 个</span></div>
      <div class="anniversary-list">${anniversaries}</div>
    </div>
    <div class="back-section"><div class="back-button"><span>返回恋爱广场</span></div></div>
    <div class="safe-bottom"></div>
  </div>`
}

const scenarios = [
  { name: 'plaza-list', title: '4 个公开空间', body: [card, longCard, card].map(item => `<div class="card-slot">${renderCard(item)}</div>`).join(''), footer: true },
  { name: 'plaza-skeleton', title: '', body: Array.from({ length: 3 }, () => '<div class="card-slot">').map(slot => `${slot}${renderCard(skeleton, { isSkeleton: true })}</div>`).join('') },
  { name: 'plaza-empty', title: '', body: emptyState },
  { name: 'plaza-small', width: 320, title: '2 个公开空间', body: [card, longCard].map(item => `<div class="card-slot">${renderCard(item)}</div>`).join('') },
  { name: 'plaza-empty-small', width: 320, height: 640, title: '', body: emptyState },
  { name: 'plaza-detail', title: '', detail: true, height: 1500 },
]

const titleMap = {
  'plaza-list': '恋爱广场 · 列表',
  'plaza-skeleton': '恋爱广场 · 骨架',
  'plaza-empty': '恋爱广场 · 空状态',
  'plaza-small': '恋爱广场 · 小屏 320',
  'plaza-empty-small': '恋爱广场 · 小屏 320 空态',
  'plaza-detail': '公开空间详情',
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const pageCss = await compile('pages/plaza/index.less')
  const cardCss = await compile('components/space-card/index.less')
  const avatarCss = await compile('components/avatar/index.less')
  const emptyCss = await compile('components/empty-state/index.less')
  const footerCss = await compile('components/list-footer/index.less')
  const navCss = await compile('components/bottom-nav/bottom-nav.less')
  const detailCss = await compile('pages/plaza-detail/index.less')

  const files = []
  for (const scenario of scenarios) {
    const width = scenario.width || 375
    const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${baseCss}
${NAV_CSS}
/* page */
${pageCss}
/* detail page */
${detailCss}
/* avatar */
${avatarCss}
/* space-card */
${cardCss}
/* empty-state */
${emptyCss}
/* list-footer */
${footerCss}
/* bottom-nav */
${navCss}
/* 预览专用：把 :host 规则展开为实际容器 */
.space-avatar { display: inline-flex; }
.bottom-nav { position: relative; }
</style></head>
<body>
<div class="phone" style="width:${width}px">
  <div style="height: 44px; background:#fdf9f6"></div>
  <div class="nav-shell">${scenario.detail ? '<span class="nav-back">‹</span>公开空间' : '恋爱广场'}<cap class="capsule"></cap></div>
  <div class="scroll-body">${scenario.detail ? renderDetail(detailView) : page({ title: scenario.title, body: scenario.body, withFooter: scenario.footer })}</div>
  <div style="height: 12px"></div>
  ${scenario.detail ? '' : bottomNav}
</div>
</body></html>`
    const file = join(OUT, `${scenario.name}.html`)
    writeFileSync(file, html)
    files.push({
      file,
      name: scenario.name,
      width,
      height: scenario.height || (scenario.name === 'plaza-list' ? 1400 : 900),
    })
    console.log(titleMap[scenario.name] || scenario.name, '→', file)
  }

  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  if (!existsSync(chrome)) {
    console.log('未找到 Chrome，跳过截图。可用浏览器打开上面的 html 查看。')
    return
  }
  for (const item of files) {
    const png = join(OUT, `${item.name}.png`)
    try {
      execFileSync(chrome, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--no-first-run',
        '--disable-extensions',
        `--user-data-dir=${join(OUT, `.chrome-${item.name}`)}`,
        '--hide-scrollbars',
        '--force-device-scale-factor=2',
        `--window-size=${item.width},${item.height}`,
        `--screenshot=${png}`,
        `file://${item.file}`,
      ], { stdio: 'ignore', timeout: 30000 })
      console.log('截图 →', png)
    } catch (error) {
      console.warn(`截图失败（${item.name}），可直接打开 HTML 查看：${item.file}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
