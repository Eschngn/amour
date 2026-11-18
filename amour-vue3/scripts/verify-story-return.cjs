/**
 * 浏览器验证脚本（仅本地验收使用，不进入构建产物）。
 *
 * 用 Playwright + 本机 Chrome 打开开发服务器，配合路由级 API mock
 * 验证「我们的故事」「恋爱广场」的返回栏与状态恢复。
 */
const { chromium } = require('playwright-core')

const BASE = process.env.BASE_URL || 'http://localhost:5211'

const CHAPTERS = [
  { id: 7001, name: '初见', colorCode: '#D94F70', startDate: '2024-05-20', endDate: '2024-05-20', nodeCount: 2 },
  { id: 7002, name: '日常', colorCode: '#5B8DEF', startDate: '2024-06-01', endDate: '2024-06-30', nodeCount: 3 },
  { id: 7003, name: '远方', colorCode: '#F59E0B', startDate: '2024-07-01', endDate: '2024-08-30', nodeCount: 2 },
]

function storyNode(id, title, chapterId, index) {
  return {
    id,
    happenedTime: `2024-06-${String(10 + index).padStart(2, '0')} 12:00:00`,
    location: '杭州',
    title,
    tagLabel: '日常',
    tagColor: '#5B8DEF',
    summary: `第 ${index + 1} 段故事的摘要，用来把列表撑到足够长以便验证滚动位置。`.repeat(3),
    coverImage: '',
  }
}

const STORIES_BY_CHAPTER = {
  7001: [storyNode(8001, '第一次见面', 7001, 0), storyNode(8004, '第一次牵手', 7001, 1)],
  7002: [
    storyNode(8002, '第一次一起看电影', 7002, 0),
    storyNode(8005, '一起做饭', 7002, 1),
    storyNode(8006, '周末的雨', 7002, 2),
  ],
  7003: [storyNode(8007, '去海边', 7003, 0), storyNode(8008, '看日落', 7003, 1)],
}

const PLAZA_SPACES = Array.from({ length: 18 }).map((_, i) => ({
  spaceId: 3001 + i,
  spaceName: `公开空间 ${i + 1}`,
  description: '这是一段公开空间的简介，用来撑起卡片高度。'.repeat(3),
  coverImage: '',
  loveStartTime: '2023-05-20 19:30:00',
  publicStoryCount: 3,
  publicPhotoCount: 2,
  publicAnniversaryCount: 1,
  members: [{ displayName: '甲', avatar: '' }, { displayName: '乙', avatar: '' }],
  latestStory: { title: '最近的故事' },
}))

const PUBLIC_SPACE_DETAIL = {
  success: true,
  data: {
    spaceId: 3001,
    spaceName: '公开空间 1',
    description: '公开空间简介',
    loveStartTime: '2023-05-20 19:30:00',
    members: [{ displayName: '甲', avatar: '', memberRole: 1 }],
    publicStoryCount: 2,
    publicPhotoCount: 1,
    publicAnniversaryCount: 1,
    stories: Array.from({ length: 6 }).map((_, i) => ({
      storyId: 9001 + i,
      title: `公开故事 ${i + 1}`,
      summary: '公开故事摘要'.repeat(6),
      contentPreview: '公开故事预览'.repeat(6),
      happenedTime: '2024-06-01 12:00:00',
      coverImage: '',
      tagLabel: '日常',
      tagColor: '#5B8DEF',
      hasContent: true,
      contentLength: 120,
      location: '杭州',
    })),
    photos: [],
    anniversaries: [],
  },
}

/**
 * 只拦截真正的后端接口请求。
 * 不能用 '**\/api/**'：Vite 开发期的模块地址里包含 /src/api/，会被一并拦掉。
 */
function isApiRequest(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/')
}

async function mockApi(page) {
  await page.route(isApiRequest, async (route) => {
    const url = new URL(route.request().url())
    const body = route.request().postDataJSON?.() || {}
    const path = url.pathname.replace(/^\/api/, '')

    const json = (payload) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })

    if (path === '/login/status') return json({ success: true, data: true })
    if (path === '/user/profile') {
      return json({ success: true, data: { username: 'chengliuxiang', displayName: '橙留香', permissions: ['frontend:story:query','frontend:photo:query','frontend:message:query','frontend:anniversary:query'], avatar: '' } })
    }
    if (path === '/space/status') {
      return json({ success: true, data: { spaceId: 2001, status: 1, spaceName: '橙子与子怡的四季', memberCount: 2, currentUserRole: 1 } })
    }
    if (path === '/story/overview') {
      return json({
        success: true,
        data: { totalNodes: 7, totalSeasons: 2, totalChapters: CHAPTERS.length, startDate: '2024-05-20', chapters: CHAPTERS },
      })
    }
    if (path === '/story/getStoryByChapterId') {
      return json({ success: true, data: STORIES_BY_CHAPTER[String(body.chapterId)] || [] })
    }
    if (path === '/story/detail') {
      const id = Number(body.id)
      return json({
        success: true,
        data: {
          id,
          title: `故事 ${id}`,
          tagLabel: '日常',
          tagColor: '#5B8DEF',
          chapterName: '日常',
          chapterColor: '#5B8DEF',
          summary: '故事摘要',
          content: Array.from({ length: 40 }).map((_, i) => `## 第 ${i + 1} 节\n\n这是正文段落，用来把页面撑长以便验证返回栏在滚动时始终可见。\n\n`).join(''),
          happenedTime: '2024-06-01 12:00:00',
          updateTime: '2024-06-02 12:00:00',
          location: '杭州',
          preStory: { id: id - 1, title: `故事 ${id - 1}` },
          nextStory: { id: id + 1, title: `故事 ${id + 1}` },
        },
      })
    }
    if (path === '/gallery/spaces') {
      const current = Number(body.current) || 1
      const size = Number(body.size) || 9
      const start = (current - 1) * size
      return json({
        success: true,
        data: {
          current,
          size,
          total: PLAZA_SPACES.length,
          records: PLAZA_SPACES.slice(start, start + size),
        },
      })
    }
    if (path === '/gallery/space/detail') return json(PUBLIC_SPACE_DETAIL)
    if (path === '/gallery/space/story/detail') {
      return json({
        success: true,
        data: {
          spaceId: Number(body.spaceId),
          storyId: Number(body.storyId),
          title: '公开故事正文',
          summary: '公开故事摘要',
          content: Array.from({ length: 45 }).map((_, i) => `## 段落 ${i + 1}\n\n公开故事正文，用来验证返回栏在长页面滚动时可见。\n\n`).join(''),
          happenedTime: '2024-06-01 12:00:00',
          location: '杭州',
          tagLabel: '日常',
          tagColor: '#5B8DEF',
          isMilestone: false,
        },
      })
    }
    if (path === '/analytics/page-view') return json({ success: true, data: null })

    return json({ success: true, data: null })
  })
}

async function login(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('amour_token', 'test-token')
    window.sessionStorage.setItem('amour_token', 'test-token')
    window.localStorage.setItem('amour_permissions', JSON.stringify(['frontend:story:query','frontend:photo:query','frontend:message:query','frontend:anniversary:query']))
  })
}

async function barInfo(page, selector = '.story-return-bar') {
  return page.evaluate((sel) => {
    const bar = document.querySelector(sel)
    if (!bar) return null
    const rect = bar.getBoundingClientRect()
    const button = bar.querySelector('a, button')
    const buttonRect = button?.getBoundingClientRect()
    const header = document.querySelector('.site-header')?.getBoundingClientRect()
    return {
      barTop: rect.top,
      barBottom: rect.bottom,
      barZ: getComputedStyle(bar).zIndex,
      barPosition: getComputedStyle(bar).position,
      buttonLabel: button?.textContent?.trim(),
      buttonVisible: Boolean(buttonRect && buttonRect.width > 0 && buttonRect.height > 0),
      buttonTop: buttonRect?.top,
      buttonHeight: buttonRect?.height,
      headerBottom: header?.bottom,
      scrollY: window.scrollY,
      docHeight: document.documentElement.scrollHeight,
      viewport: window.innerHeight,
    }
  }, selector)
}

async function run() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
  const results = []
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` :: ${JSON.stringify(detail)}`}`)
  }

  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
      const page = await context.newPage()
      await login(page)
      await mockApi(page)

      // ---------- 需求一：故事详情返回栏始终可见 ----------
      await page.goto(`${BASE}/story/8002`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      const top = await barInfo(page)
      check(`[${viewport.name}] 详情页顶部返回栏可见`, Boolean(top?.buttonVisible), top)
      check(`[${viewport.name}] 返回栏低于顶栏`, top && top.barTop >= top.headerBottom - 1, top)
      check(`[${viewport.name}] 返回栏层级低于顶栏(40)`, top && Number(top.barZ) < 40, top)

      const midScroll = Math.floor((top.docHeight - top.viewport) / 2)
      await page.evaluate((y) => window.scrollTo(0, y), midScroll)
      await page.waitForTimeout(300)
      const mid = await barInfo(page)
      check(`[${viewport.name}] 滚动到中间返回栏仍可见`, Boolean(mid?.buttonVisible) && mid.barTop >= mid.headerBottom - 1, mid)

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(300)
      const bottom = await barInfo(page)
      check(`[${viewport.name}] 滚动到底部返回栏仍可见`, Boolean(bottom?.buttonVisible) && bottom.barTop >= bottom.headerBottom - 1, bottom)
      // 返回栏不能遮住正文：按钮区域高度有限，正文可以滚到它下面
      check(`[${viewport.name}] 返回栏高度不超过 3.5rem+安全区`, bottom && bottom.barBottom - bottom.barTop <= 80, bottom)

      await page.screenshot({ path: `/tmp/amour-${viewport.name}-detail-bottom.png`, fullPage: false })
      await context.close()
    }

    // ---------- 需求二.1：我们的故事章节 + 滚动恢复 ----------
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await login(page)
      await mockApi(page)

      await page.goto(`${BASE}/story`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      // 切到第二章（非默认章节）
      await page.getByRole('button', { name: /日常/ }).first().click()
      await page.waitForTimeout(500)
      const heading = await page.locator('h2').filter({ hasText: '日常' }).first().textContent()
      check('已切换到第二章', heading?.includes('日常'), heading)

      const beforeScroll = await page.evaluate(() => {
        window.scrollTo(0, Math.min(700, document.documentElement.scrollHeight - window.innerHeight))
        return window.scrollY
      })
      await page.waitForTimeout(300)
      // 进入详情：用 DOM click 而不是 Playwright click，
      // 避免 Playwright 自动滚动把元素滚进视口后改变“离开时的滚动位置”。
      await page.evaluate(() => {
        document.querySelector('a[href^="/story/80"]').click()
      })
      await page.waitForURL('**/story/**', { timeout: 5000 })
      await page.waitForTimeout(600)
      const detailUrl = page.url()
      check('进入故事详情', /\/story\/\d+$/.test(new URL(detailUrl).pathname), detailUrl)

      // 详情滚动到中间后点返回
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(300)
      await page.locator('.story-return-bar a, .story-return-bar button').first().click()
      await page.waitForTimeout(900)

      const afterUrl = new URL(page.url()).pathname
      check('返回后回到故事列表', afterUrl === '/story', afterUrl)
      const restored = await page.evaluate(() => ({
        scrollY: window.scrollY,
        activeChapter: [...document.querySelectorAll('nav[aria-label="故事章节"] button')]
          .find(el => el.className.includes('bg-white shadow-md'))?.textContent?.trim() || '',
      }))
      check('返回后恢复第二章', restored.activeChapter.includes('日常'), restored)
      check('返回后恢复滚动位置', Math.abs(restored.scrollY - beforeScroll) <= 40, { restored, beforeScroll })

      // 浏览器前进/后退仍正常：返回按钮用 go(-1) 回到列表，
      // 此时再前进应回到刚看过的详情，后退应再次回到列表。
      await page.goForward()
      await page.waitForTimeout(700)
      check('浏览器前进回到详情', /\/story\/\d+$/.test(new URL(page.url()).pathname), page.url())
      await page.goBack()
      await page.waitForTimeout(700)
      check('浏览器后退回到列表并保留章节', new URL(page.url()).pathname === '/story', page.url())
      await context.close()
    }

    // ---------- 连续翻篇后仍能一次返回原列表 ----------
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await login(page)
      await mockApi(page)

      await page.goto(`${BASE}/story`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: /日常/ }).first().click()
      await page.waitForTimeout(500)
      await page.evaluate(() => window.scrollTo(0, 420))
      await page.waitForTimeout(350)
      const before = await page.evaluate(() => ({ scrollY: window.scrollY }))

      await page.evaluate(() => document.querySelector('a[href^="/story/8"]').click())
      await page.waitForTimeout(800)
      // 连续两次“下一篇”
      await page.evaluate(() => document.querySelectorAll('nav[aria-label="故事翻篇导航"] a')[1].click())
      await page.waitForTimeout(800)
      await page.evaluate(() => document.querySelectorAll('nav[aria-label="故事翻篇导航"] a')[1].click())
      await page.waitForTimeout(800)

      const hopState = await page.evaluate(() => window.history.state?.amourReturnTarget)
      check('连续翻篇递增 hop 保留来源', hopState?.hop === 2 && hopState?.path === '/story', hopState)

      await page.locator('.story-return-bar a, .story-return-bar button').first().click()
      await page.waitForTimeout(1000)
      const after = await page.evaluate(() => ({
        path: location.pathname,
        scrollY: window.scrollY,
        chapter: [...document.querySelectorAll('nav[aria-label="故事章节"] button')]
          .findIndex(el => el.className.includes('bg-white shadow-md')),
      }))
      check('连续翻篇后一次返回原列表章节', after.path === '/story' && after.chapter === 1, after)
      check('连续翻篇后一次返回原滚动位置', Math.abs(after.scrollY - before.scrollY) <= 40, { after, before })
      await context.close()
    }

    // ---------- 刷新列表后仍恢复章节与滚动 ----------
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await login(page)
      await mockApi(page)

      await page.goto(`${BASE}/story`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: /日常/ }).first().click()
      await page.waitForTimeout(500)
      await page.evaluate(() => window.scrollTo(0, 520))
      await page.waitForTimeout(400)

      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      const after = await page.evaluate(() => ({
        scrollY: window.scrollY,
        chapter: [...document.querySelectorAll('nav[aria-label="故事章节"] button')]
          .findIndex(el => el.className.includes('bg-white shadow-md')),
      }))
      check('刷新列表后恢复章节', after.chapter === 1, after)
      check('刷新列表后恢复滚动位置', Math.abs(after.scrollY - 520) <= 40, after)
      await context.close()
    }

    // ---------- 需求二.1（回退）：直接打开详情 => 默认列表 ----------
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await login(page)
      await mockApi(page)
      await page.goto(`${BASE}/story/8002`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      await page.locator('.story-return-bar a, .story-return-bar button').first().click()
      await page.waitForTimeout(800)
      const path = new URL(page.url()).pathname
      check('直接打开详情后返回进入默认故事列表', path === '/story', path)
      await context.close()
    }

    // ---------- 需求二.2：恋爱广场分页 + 滚动恢复 ----------
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await login(page)
      await mockApi(page)

      await page.goto(`${BASE}/plaza`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      await page.getByRole('button', { name: /加载更多公开空间/ }).click()
      await page.waitForTimeout(600)
      const cardCount = await page.locator('a[aria-label$="的情侣空间"]').count()
      check('广场已加载两页', cardCount > 9, { cardCount })

      const beforeScroll = await page.evaluate(() => {
        window.scrollTo(0, Math.min(1000, document.documentElement.scrollHeight - window.innerHeight))
        return window.scrollY
      })
      await page.waitForTimeout(300)
      await page.evaluate(() => {
        document.querySelectorAll('a[aria-label$="的情侣空间"]')[11].click()
      })
      await page.waitForURL('**/plaza/**', { timeout: 5000 })
      await page.waitForTimeout(600)
      check('进入公开空间详情', /^\/plaza\/\d+$/.test(new URL(page.url()).pathname), page.url())

      // 在公开空间页滚动一段，作为“进入故事前的浏览位置”
      const spaceScrollBefore = await page.evaluate(() => {
        window.scrollTo(0, Math.min(600, document.documentElement.scrollHeight - window.innerHeight))
        return window.scrollY
      })
      await page.waitForTimeout(350)

      // 从公开空间进入公开故事详情再逐层返回（DOM 点击避免自动滚动改变锚点）
      await page.evaluate(() => document.querySelector('a[aria-label^="阅读全文"]').click())
      await page.waitForURL('**/story/**', { timeout: 5000 })
      await page.waitForTimeout(600)
      check('进入公开故事详情', /^\/plaza\/\d+\/story\/\d+$/.test(new URL(page.url()).pathname), page.url())

      await page.locator('.story-return-bar a, .story-return-bar button').first().click()
      await page.waitForTimeout(800)
      check('公开故事返回公开空间', /^\/plaza\/\d+$/.test(new URL(page.url()).pathname), page.url())
      // 公开空间本身也要恢复滚动位置（从故事详情退回时）。
      const spaceScroll = await page.evaluate(() => window.scrollY)
      check(
        '公开故事返回后恢复公开空间滚动位置',
        spaceScrollBefore > 0 && Math.abs(spaceScroll - spaceScrollBefore) <= 40,
        { spaceScroll, spaceScrollBefore },
      )

      await page.locator('.story-return-bar a, .story-return-bar button').first().click()
      await page.waitForTimeout(1200)

      const after = await page.evaluate(() => ({
        path: location.pathname,
        scrollY: window.scrollY,
        cards: document.querySelectorAll('a[aria-label$="的情侣空间"]').length,
      }))
      check('回到恋爱广场列表', after.path === '/plaza', after)
      check('返回后恢复已加载分页', after.cards === cardCount, { after, cardCount })
      check('返回后恢复广场滚动位置', Math.abs(after.scrollY - beforeScroll) <= 40, { after, beforeScroll })
      await context.close()
    }

    // ---------- 直接打开公开故事详情 => 回退到所属空间 ----------
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await login(page)
      await mockApi(page)
      await page.goto(`${BASE}/plaza/3001/story/9002`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      const bar = await barInfo(page)
      check('公开故事直接打开时文案为返回公开空间', bar?.buttonLabel === '返回公开空间', bar)
      await page.locator('.story-return-bar a, .story-return-bar button').first().click()
      await page.waitForTimeout(800)
      check('公开故事直接打开回退到所属公开空间', new URL(page.url()).pathname === '/plaza/3001', page.url())
      await context.close()
    }
  } finally {
    await browser.close()
  }

  const failed = results.filter(item => !item.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) process.exitCode = 1
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
