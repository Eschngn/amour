import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 运行：npm test
 *
 * 故事详情返回栏与列表状态恢复的页面级约束。
 *
 * 项目没有引入 @vue/test-utils / jsdom，无法在 node:test 里模拟真实滚动，
 * 因此这里验证组件的接线方式（模板结构 + 组合式函数调用），
 * 真实滚动行为由 listViewState.test.mjs / scrollRestore.test.mjs 的纯函数覆盖，
 * 浏览器布局则由 Playwright 截图人工核对。
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

test('故事详情页返回按钮始终可见，且不再只在 Hero 顶部出现一次', () => {
  const source = readSource('pages/frontend/StoryDetail.vue')

  // 常驻返回栏：sticky 在顶栏下方，且不依赖详情数据是否加载完成。
  assert.match(source, /<StoryReturnBar/)
  assert.match(source, /:to="returnTo \|\| '\/story'"/)
  assert.match(source, /:link="!canGoBack"/)
  assert.match(source, /@activate="goBack"/)
  // 返回栏位于 loading 分支之前，加载中也能返回。
  const barIndex = source.indexOf('<StoryReturnBar')
  const loadingIndex = source.indexOf('v-if="loading"')
  assert.ok(barIndex > 0 && loadingIndex > barIndex, '返回栏必须在加载分支之前渲染')

  // Hero 里原来的内联返回链接已移除，避免重复出现两个返回入口。
  assert.doesNotMatch(source, /<router-link to="\/story"/)
  // 空状态仍提供返回链接，且指向可信来源。
  assert.match(source, /故事不在这里/)
})

test('故事详情返回栏使用 sticky 并预留安全区与层级', () => {
  const bar = readSource('components/frontend/StoryReturnBar.vue')

  // 层级低于站点顶栏（z-40），高于正文，滚动时压住正文但不遮顶栏。
  assert.match(bar, /class="story-return-bar pointer-events-none sticky z-30"/)
  // 返回栏外层的透明渐变区域不能拦截正文点击，只有按钮本身可交互。
  assert.match(bar, /story-return-button pointer-events-auto/)
  assert.match(bar, /calc\(var\(--site-header-height, 64px\)/)
  assert.match(bar, /env\(safe-area-inset-bottom/)
  // 触控目标不小于 36px，键盘可聚焦。
  assert.match(bar, /min-h-\[2\.25rem\]/)
  assert.match(bar, /focus-visible:ring-2/)
  // 正文容器与站点其它页面同宽，移动端不撑破布局。
  assert.match(bar, /max-w-5xl px-4 sm:px-6 lg:px-8/)
  // 支持键盘触发：链接语义或按钮语义二选一，不会渲染成不可聚焦的 div。
  assert.match(bar, /:is="asLink \? RouterLink : 'button'"/)
})

test('顶栏高度实测后写入 CSS 变量，移动端二级导航变高也不会遮挡返回栏', () => {
  const header = readSource('components/frontend/SiteHeader.vue')
  assert.match(header, /--site-header-height/)
  assert.match(header, /new ResizeObserver/)
  assert.match(header, /measureHeaderHeight\(\)/)
  assert.match(header, /headerResizeObserver\?\.disconnect\(\)/)

  const css = readSource('assets/main.css')
  assert.match(css, /--site-header-height: 64px/)
  assert.match(css, /--detail-return-bar-height/)
  // 正文目录在详情页吸顶时要让开返回栏。
  const detail = readSource('pages/frontend/StoryDetail.vue')
  assert.match(detail, /detail-sticky-below-bar/)
})

test('我们的故事列表保存并恢复章节与滚动位置', () => {
  const source = readSource('pages/frontend/OurStoryPage.vue')

  // 离开时写快照，章节下标来自 activeChapter。
  assert.match(source, /useListViewSnapshot\(\{/)
  assert.match(source, /collect: \(\) => \(\{ chapterIndex: activeChapter\.value \}\)/)
  // 首屏按快照恢复章节；章节失效时回落第一章。
  assert.match(source, /sanitizeChapterIndex\(restoreChapterIndex, chapters\.value\.length\)/)
  assert.match(source, /restoreScrollPosition\(/)
  // 恢复章节时抑制 watcher，避免重复请求第一章。
  assert.match(source, /suppressChapterWatch/)
  // 进入详情时携带来源列表，返回才能命中同一条历史记录。
  assert.match(source, /function storyLink\(story\)/)
  assert.match(source, /withReturnState\(\s*'\/story\/' \+ story\.id/)
  assert.match(source, /buildReturnTarget\(route\.fullPath \|\| STORY_LIST_PATH\)/)
})

test('恋爱广场保存已加载页数并逐页补齐后再恢复滚动', () => {
  const source = readSource('pages/frontend/LovePlazaPage.vue')

  assert.match(source, /useListViewSnapshot\(\{/)
  assert.match(source, /collect: \(\) => \(\{ loadedPages: current\.value \}\)/)
  assert.match(source, /sanitizePlazaPageCount\(/)
  // 逐页追加直到恢复到快照页数，失败或没有更多就停。
  assert.match(source, /while \(current\.value < restorePages && hasMore\.value/)
  assert.match(source, /restoreScrollPosition\(/)
  // 打开公开空间时携带来源。
  assert.match(source, /withReturnState\(\s*`\/plaza\/\$\{space\.spaceId\}`/)
})

test('公开空间详情页返回优先走历史回退，直接打开时退回广场', () => {
  const source = readSource('pages/frontend/PublicSpaceDetailPage.vue')

  assert.match(source, /<StoryReturnBar/)
  assert.match(source, /resolvePublicSpaceDetailReturn/)
  assert.match(source, /isAllowedReturnPath: isPlazaListPath/)
  // 加载失败与空状态也提供返回入口。
  assert.match(source, /返回恋爱广场/)
  // 阅读全文入口携带公开空间作为来源。
  assert.match(source, /function publicStoryLink\(story\)/)
  assert.match(source, /buildReturnTarget\(route\.fullPath\)/)
})

test('公开故事详情页返回来源支持广场列表与公开空间', () => {
  const source = readSource('pages/frontend/PublicStoryDetailPage.vue')

  assert.match(source, /<StoryReturnBar/)
  assert.match(source, /resolvePublicStoryDetailReturn/)
  assert.match(source, /isPlazaListPath\(path\) \|\| isPublicSpacePath\(path\)/)
  // 直接打开时回到故事所属的公开空间。
  assert.match(source, /fallbackPath: spaceLink\.value/)
  assert.match(source, /返回公开空间/)
})

test('详情页返回组合式函数会在路由切换后重新读取历史 state', () => {
  const source = readSource('composables/useDetailReturnTarget.js')

  assert.match(source, /readHistoryState\(\)/)
  assert.match(source, /watch\(\s*\(\) => route\.fullPath/)
  // 返回：可信来源用 router.go，不可信来源 router.push，不会卡在空白页。
  assert.match(source, /router\.go\(navigation\.delta\)/)
  assert.match(source, /await router\.push\(navigation\?\.path \|\| fallbackPath\)/)
})

test('列表快照组合式函数在离开路由与页面隐藏时保存', () => {
  const source = readSource('composables/useListViewSnapshot.js')

  assert.match(source, /onBeforeRouteLeave/)
  assert.match(source, /addEventListener\('pagehide'/)
  assert.match(source, /removeEventListener\('pagehide'/)
  assert.match(source, /addEventListener\('beforeunload'/)
  // 只在列表页读取快照，详情页不会误用。
  assert.match(source, /isRestorableListViewPath\(restoreTarget\)/)
  // 写入失败不影响导航。
  assert.match(source, /return written/)
  // 滚动时节流保存，刷新后也能停在原位置。
  assert.match(source, /addEventListener\('scroll', scheduleSave/)
  assert.match(source, /LIST_SNAPSHOT_THROTTLE_MS/)
})

test('浏览器回退时不会把列表快照写到目标历史记录上', () => {
  // 回归用例：popstate 触发时 history.state 已经切到目标记录，
  // 若照常 replaceState 会覆盖目标记录的列表快照，返回后分页与滚动全部丢失。
  const source = readSource('composables/useListViewSnapshot.js')

  assert.match(source, /function ownsCurrentHistoryEntry\(\)/)
  assert.match(source, /state\.current === route\?\.fullPath/)
  // 保存动作在写入前先做归属校验。
  const saveIndex = source.indexOf('function saveSnapshot()')
  const guardIndex = source.indexOf('ownsCurrentHistoryEntry()', saveIndex)
  const writeIndex = source.indexOf('writeListViewSnapshot(', saveIndex)
  assert.ok(guardIndex > saveIndex && writeIndex > guardIndex, '写入前必须先校验历史记录归属')
})

test('公开空间详情页作为公开故事来源时也恢复自己的滚动位置', () => {
  const source = readSource('pages/frontend/PublicSpaceDetailPage.vue')

  // 公开空间也是可返回的浏览位置：从公开故事详情退回时恢复滚动。
  assert.match(source, /useListViewSnapshot\(\{/)
  assert.match(source, /restoreScrollPosition\(/)
  assert.match(source, /restoreScroll: true/)
  // 快照只消费一次，切换空间时不误用上一个空间的记录。
  assert.match(source, /savedListView\.value = null/)
})

test('返回按钮拥有可访问名称，不依赖图标表达语义', () => {
  // 返回按钮文案本身可读（“返回故事列表”“返回恋爱广场”“返回公开空间”），
  // 并额外提供 aria-label；公开故事详情的名称随来源变化，用动态绑定。
  const expectations = [
    ['pages/frontend/StoryDetail.vue', /aria-label="返回故事列表"/],
    ['pages/frontend/PublicSpaceDetailPage.vue', /aria-label="返回恋爱广场"/],
    ['pages/frontend/PublicStoryDetailPage.vue', /:aria-label="returnLabel"/],
  ]
  for (const [file, pattern] of expectations) {
    const source = readSource(file)
    assert.match(source, pattern, file)
    assert.match(source, /返回故事列表|返回恋爱广场|返回公开空间/, file)
  }
  // 公开故事详情根据来源决定文案，含默认兜底“返回公开空间”。
  const publicStory = readSource('pages/frontend/PublicStoryDetailPage.vue')
  assert.match(publicStory, /'返回公开空间'/)
  assert.match(publicStory, /'返回恋爱广场'/)
  // 文案必须依据 returnTarget（go 模式下 returnTo 为空，但仍能识别来源）。
  assert.match(publicStory, /isPlazaListPath\(returnTarget\.value\?\.path\)/)
})

test('故事详情页不再在每次请求结束时无条件滚到顶部覆盖恢复位置', () => {
  const source = readSource('pages/frontend/StoryDetail.vue')
  // 详情页切换上一篇/下一篇时回到顶部是预期行为，但必须在返回栏之后执行，
  // 且不能影响列表页自己的恢复逻辑（列表滚动恢复只在列表组件里做）。
  assert.match(source, /window\.scrollTo\(\{ top: 0, behavior: 'auto' \}\)/)
  const list = readSource('pages/frontend/OurStoryPage.vue')
  assert.doesNotMatch(list, /window\.scrollTo\(\{ top: 0/)
})
