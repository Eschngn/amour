import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'

/**
 * 空间设置页「销毁并清空空间」的**真实浏览器交互**回归测试。
 *
 * 为什么需要这一层：SSR 渲染测试（spaceSettingsRender.test.mjs）能证明按钮出现在
 * HTML 里，但证明不了「点击后真的打开确认框」「取消真的不发请求」「窄屏下真的可点」。
 * 项目没有 jsdom / Vitest，因此这里用本机 Chrome（playwright-core）跑真实交互。
 *
 * 依赖是**可选**的：playwright-core 不属于项目 package.json 依赖，
 * 缺失时整组优雅跳过并说明原因，绝不静默通过、也不会让 node --test 解析失败。
 *
 * 前置条件（缺失时整组跳过）：
 * 1. playwright-core 与 Chrome/Chromium 可用；
 * 2. Vite 开发服务器已启动（默认 http://127.0.0.1:5173）；
 * 3. 环境变量 AMOUR_E2E_CREATOR_USERNAME / AMOUR_E2E_CREATOR_PASSWORD 指定的
 *    「创建者 + 另一半未加入」测试账号；以及 AMOUR_E2E_PARTNER_USERNAME / PASSWORD
 *    指定的「无空间」账号。
 *
 * 本脚本**只读**：点击销毁后一律取消，并在取消后断言没有发出 POST /space/destroy。
 * 它不会销毁任何真实空间。
 *
 * 运行示例：
 *   AMOUR_E2E_CREATOR_USERNAME=xxx AMOUR_E2E_CREATOR_PASSWORD=xxx \
 *   AMOUR_E2E_PARTNER_USERNAME=yyy AMOUR_E2E_PARTNER_PASSWORD=yyy \
 *   npm run test:space-settings-browser
 */

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

const WEB_BASE = process.env.AMOUR_E2E_WEB_BASE || 'http://127.0.0.1:5173'
const CREATOR = {
  username: process.env.AMOUR_E2E_CREATOR_USERNAME || '',
  password: process.env.AMOUR_E2E_CREATOR_PASSWORD || '',
}
const PARTNER = {
  username: process.env.AMOUR_E2E_PARTNER_USERNAME || '',
  password: process.env.AMOUR_E2E_PARTNER_PASSWORD || '',
}
/** 两名成员的空间（另一半已加入）：用于验证基础信息只读与解绑入口。 */
const TWO_MEMBER = {
  username: process.env.AMOUR_E2E_TWO_MEMBER_USERNAME || '',
  password: process.env.AMOUR_E2E_TWO_MEMBER_PASSWORD || '',
}
/** 是否要求在真实浏览器里操作销毁按钮并取消（默认开启，绝不真正销毁）。 */
const DESTROY_INTERACTION_ENABLED = process.env.AMOUR_E2E_SKIP_DESTROY_INTERACTION !== '1'

const chromePath = CHROME_CANDIDATES.find(path => existsSync(path))
const missing = []
if (!chromePath) missing.push('本机没有可用的 Chrome/Chromium')
if (!CREATOR.username || !CREATOR.password) {
  missing.push('缺少 AMOUR_E2E_CREATOR_USERNAME / AMOUR_E2E_CREATOR_PASSWORD')
}
if (!PARTNER.username || !PARTNER.password) {
  missing.push('缺少 AMOUR_E2E_PARTNER_USERNAME / AMOUR_E2E_PARTNER_PASSWORD')
}

/**
 * playwright-core 不是项目依赖（用于本机真实浏览器验证的可选工具）。
 * 动态加载：缺失时跳过而不是让模块解析直接失败。
 */
async function loadChromium() {
  try {
    const module = await import('playwright-core')
    return module.chromium || module.default?.chromium || null
  } catch {
    missing.push('未安装 playwright-core（可选依赖，仅用于真实浏览器交互验证）')
    return null
  }
}

/** 后端/前端服务是否可用；不可用时明确跳过而不是让用例挂死。 */
async function probeServers() {
  const probes = [
    [`${WEB_BASE}/`, 'Vite 开发服务器'],
  ]
  for (const [url, label] of probes) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
      if (!response.ok) missing.push(`${label} 返回 ${response.status}`)
    } catch {
      missing.push(`${label} 不可达（${url}）`)
    }
  }
}

let browser = null
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** 打开一个屏蔽外网静态资源的页面，避免字体/OSS 请求拖慢加载。 */
async function openPage(viewport) {
  const context = await browser.newContext({ viewport })
  await context.route('**://fonts.googleapis.com/**', route => route.abort())
  await context.route('**://fonts.gstatic.com/**', route => route.abort())
  await context.route('**://*.aliyuncs.com/**', route => route.abort())
  const page = await context.newPage()
  page.setDefaultTimeout(60000)
  return { context, page }
}

async function login(page, { username, password }) {
  await page.goto(`${WEB_BASE}/login`, { waitUntil: 'commit' })
  await page.waitForSelector('input[autocomplete=username]', { timeout: 90000 })
  await page.fill('input[autocomplete=username]', username)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
  for (let i = 0; i < 120; i += 1) {
    if (!page.url().includes('/login')) return
    await sleep(500)
  }
  throw new Error(`登录没有离开 /login，当前地址：${page.url()}`)
}

/** 只记录业务接口请求（过滤前端模块与静态资源）。 */
function trackApiRequests(page) {
  const requests = []
  page.on('request', (request) => {
    const url = request.url()
    if (!url.includes('/api/')) return
    if (/\.(js|css|vue|svg|png|jpg|jpeg|webp|woff2?|ttf)$/.test(url)) return
    requests.push({ method: request.method(), path: url.split('/api')[1], body: request.postData() })
  })
  return requests
}

test.before(async () => {
  if (missing.length) return
  await probeServers()
  if (missing.length) return
  const chromium = await loadChromium()
  if (!chromium) return
  browser = await chromium.launch({ executablePath: chromePath, headless: true })
})

test.after(async () => {
  if (browser) await browser.close()
  browser = null
})

/** 依赖缺失时统一跳过，并把原因写进测试输出。 */
function requireEnv(t) {
  if (missing.length) {
    t.skip(`跳过浏览器交互验证：${missing.join('；')}`)
    return false
  }
  return true
}

test('桌面：单人创建者能看到销毁按钮，点击打开确认框、取消不发请求', async (t) => {
  if (!requireEnv(t)) return
  const { context, page } = await openPage({ width: 1440, height: 900 })
  try {
    const requests = trackApiRequests(page)
    await login(page, CREATOR)
    await page.goto(`${WEB_BASE}/space/setup#space-danger-zone`, { waitUntil: 'commit' })
    const destroyButton = page.locator('#space-destroy button')
    await destroyButton.waitFor({ state: 'visible', timeout: 90000 })

    // 可见、可点击、没有被容器裁剪。
    assert.equal(await destroyButton.isVisible(), true)
    assert.equal(await destroyButton.isEnabled(), true)
    const box = await destroyButton.boundingBox()
    assert.ok(box && box.width > 80 && box.height > 20, '销毁按钮应有可点击尺寸')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, '桌面不应有横向溢出')

    // 信息架构：左侧纵向分区导航 + 右侧危险操作内容，危险操作本身不再吸顶或悬浮。
    assert.equal(await page.locator('#space-danger-zone').count(), 1, '危险操作区应通过 hash 深链渲染')
    assert.equal(await page.locator('#space-danger-zone aside').count(), 0, '危险操作区不得使用侧栏容器')
    assert.equal(await page.locator('aside[aria-label="空间设置分区导航"]').count(), 1, '应渲染左侧分区导航')
    const layout = await page.evaluate(() => {
      const zone = document.querySelector('#space-danger-zone')
      const nav = document.querySelector('aside[aria-label="空间设置分区导航"]')
      const rect = element => (element ? element.getBoundingClientRect() : null)
      const navRect = rect(nav)
      const zoneRect = rect(zone)
      return {
        zone: zone ? zone.getBoundingClientRect().top : null,
        position: zone ? getComputedStyle(zone).position : null,
        navRight: navRect ? navRect.right : null,
        zoneLeft: zoneRect ? zoneRect.left : null,
        navWidth: navRect ? navRect.width : 0,
        zoneWidth: zoneRect ? zoneRect.width : 0,
      }
    })
    assert.notEqual(layout.zone, null, '危险操作区必须渲染')
    assert.notEqual(layout.position, 'sticky', '危险操作区不得吸顶')
    assert.notEqual(layout.position, 'fixed', '不得出现悬浮销毁按钮')
    assert.ok(layout.navWidth > 0 && layout.navWidth < 300, '左侧导航保持稳定窄栏')
    assert.ok(layout.navRight <= layout.zoneLeft + 8, '右侧内容应位于导航右侧')
    assert.ok(layout.zoneWidth > 0, '危险操作区应有可用宽度')

    if (!DESTROY_INTERACTION_ENABLED) return
    requests.length = 0
    await destroyButton.click()
    const dialog = page.locator('.el-message-box')
    await dialog.waitFor({ state: 'visible', timeout: 20000 })

    // 二次确认文案与逐字输入校验。
    assert.match((await dialog.locator('.el-message-box__title').textContent()).trim(), /销毁并清空情侣空间/)
    const message = (await dialog.locator('.el-message-box__message').textContent()).replace(/\s+/g, ' ')
    assert.match(message, /都不可见/, '必须说明双方都看不到空间')
    assert.match(message, /无法自行恢复/, '必须说明用户侧不能自行恢复')
    assert.match(message, /平台管理员/, '必须说明只有管理员可以协助恢复')
    assert.match(await dialog.locator('textarea').getAttribute('placeholder'), /请输入“销毁”以确认/)

    // 确认框打开期间已占提交锁，不满足条件时按钮不可重复提交。
    const lockState = await page.evaluate(() => {
      const button = document.querySelector('#space-destroy button')
      return { disabled: button.disabled, ariaBusy: button.getAttribute('aria-busy') }
    })
    assert.equal(lockState.disabled, true, '确认框打开期间销毁按钮应禁用')
    assert.equal(lockState.ariaBusy, 'true')

    // 错误输入必须被拦截，且不能发请求。
    await dialog.locator('textarea').fill('销毁一下')
    await dialog.locator('button:has-text("确认销毁")').click()
    await sleep(600)
    assert.match(
      ((await dialog.locator('.el-message-box__errormsg').textContent().catch(() => '')) || '').trim(),
      /请准确输入“销毁”以确认/,
    )
    assert.equal(await dialog.isVisible(), true, '输入错误时确认框应保持打开')
    assert.equal(requests.some(item => item.path === '/space/destroy'), false, '输入错误不得发销毁请求')

    // 取消：不发请求、状态不变、按钮恢复。
    await dialog.locator('button:has-text("取消")').click()
    await dialog.waitFor({ state: 'hidden', timeout: 15000 })
    await sleep(800)
    assert.equal(requests.filter(item => item.path === '/space/destroy').length, 0, '取消后绝不能发出销毁请求')
    assert.equal(await destroyButton.isEnabled(), true, '取消后必须释放提交锁')
    assert.equal(page.url().includes('/space/setup'), true, '取消后应留在空间设置页')
    assert.equal(await page.locator('#space-destroy').count(), 1, '取消后销毁入口仍在')
  } finally {
    await context.close()
  }
})

test('窄屏：销毁按钮可滚动到视口内且能接收点击', async (t) => {
  if (!requireEnv(t)) return
  const { context, page } = await openPage({ width: 390, height: 844 })
  try {
    await login(page, CREATOR)
    await page.goto(`${WEB_BASE}/space/setup#space-danger-zone`, { waitUntil: 'commit' })
    const destroyButton = page.locator('#space-destroy button')
    await destroyButton.waitFor({ state: 'visible', timeout: 90000 })
    await destroyButton.scrollIntoViewIfNeeded()

    // 窄屏：左栏折叠为顶部横向导航，导航与内容都不产生横向溢出。
    const narrowLayout = await page.evaluate(() => {
      const nav = document.querySelector('aside[aria-label="空间设置分区导航"]')
      const zone = document.querySelector('#space-danger-zone')
      const navRect = nav ? nav.getBoundingClientRect() : null
      const zoneRect = zone ? zone.getBoundingClientRect() : null
      return { nav: navRect, zone: zoneRect }
    })
    assert.ok(narrowLayout.nav, '窄屏导航必须渲染')
    assert.ok(narrowLayout.zone, '窄屏危险操作区必须渲染')
    assert.ok(narrowLayout.nav.top < narrowLayout.zone.top, '窄屏导航应在内容上方')
    assert.ok(narrowLayout.nav.width <= 390, '窄屏导航不能横向溢出')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, '窄屏不应有横向溢出')

    const geometry = await destroyButton.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }
    })
    assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.viewportHeight, '窄屏滚动后按钮应完整进入视口')
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewportWidth, '窄屏按钮不应横向溢出')

    // 按钮中心点确实命中按钮本身（没有被其它元素遮挡）。
    const hitsSelf = await destroyButton.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return target === element || element.contains(target)
    })
    assert.equal(hitsSelf, true, '按钮中心必须可被点击命中')

    // 窄屏同样能打开确认框（证明不是只渲染了一个不可交互的元素）。
    await destroyButton.click()
    const dialog = page.locator('.el-message-box')
    await dialog.waitFor({ state: 'visible', timeout: 20000 })
    assert.equal(await dialog.isVisible(), true)
    await dialog.locator('button:has-text("取消")').click()
    await dialog.waitFor({ state: 'hidden', timeout: 15000 })
  } finally {
    await context.close()
  }
})

test('双人空间：基础信息只读、不出现编辑按钮，解绑入口在危险操作区', async (t) => {
  if (!TWO_MEMBER.username || !TWO_MEMBER.password) {
    t.skip('跳过：缺少 AMOUR_E2E_TWO_MEMBER_USERNAME / AMOUR_E2E_TWO_MEMBER_PASSWORD')
    return
  }
  if (!requireEnv(t)) return
  const { context, page } = await openPage({ width: 1440, height: 900 })
  try {
    await login(page, TWO_MEMBER)
    await page.goto(`${WEB_BASE}/space/setup#space-basic-info`, { waitUntil: 'commit' })
    await page.waitForSelector('#space-basic-info', { timeout: 90000 })

    const basicHtml = await page.locator('#space-basic-info').innerHTML()
    assert.doesNotMatch(basicHtml, /<button[^>]*>\s*编辑空间信息/, '另一半已加入时不得出现编辑按钮')
    assert.match(basicHtml, /另一半已经加入/, '必须说明为什么不能再修改')

    // 销毁入口不存在，解绑入口位于危险操作区内部。
    await page.goto(`${WEB_BASE}/space/setup#space-danger-zone`, { waitUntil: 'commit' })
    await page.waitForSelector('#space-danger-zone', { timeout: 90000 })
    assert.equal(await page.locator('#space-destroy').count(), 0, '双人空间不得出现销毁入口')
    assert.equal(await page.locator('#space-danger-zone #space-unbind').count(), 1, '解绑入口必须在危险操作区')
  } finally {
    await context.close()
  }
})

test('等待绑定：基础信息可编辑，取消不发请求、保存后没有跳走', async (t) => {
  if (!requireEnv(t)) return
  const { context, page } = await openPage({ width: 1440, height: 900 })
  try {
    const requests = trackApiRequests(page)
    await login(page, CREATOR)
    await page.goto(`${WEB_BASE}/space/setup#space-basic-info`, { waitUntil: 'commit' })
    const editButton = page.locator('#space-basic-info button:has-text("编辑空间信息")')
    await editButton.waitFor({ state: 'visible', timeout: 90000 })

    // 进入编辑态：默认回填服务端数据，并显示字数提示。
    await editButton.click()
    const nameInput = page.locator('#space-basic-info-name')
    await nameInput.waitFor({ state: 'visible', timeout: 15000 })
    const originalName = await nameInput.inputValue()
    assert.ok(originalName.length > 0, '名称必须回填服务端数据')
    assert.equal(await page.locator('#space-basic-info-love-start').count(), 1, '恋爱开始时间必须使用已有日期组件')
    const lengthHints = await page.locator('#space-basic-info .text-\\[11px\\]').allTextContents()
    assert.ok(lengthHints.some(text => /\/\s*30/.test(text)), `缺少名称长度提示：${lengthHints.join(' | ')}`)
    assert.ok(lengthHints.some(text => /\/\s*500/.test(text)), '缺少简介长度提示')

    // 取消：不发请求、恢复原值、退出编辑态。
    requests.length = 0
    await nameInput.fill('临时改动的名称')
    await page.locator('#space-basic-info button:has-text("取消")').click()
    await page.waitForTimeout(600)
    assert.equal(await page.locator('#space-basic-info-name').count(), 0, '取消后应退出编辑态')
    assert.equal(requests.filter(item => item.path === '/space/update').length, 0, '取消绝不能发出更新请求')
    assert.ok((await page.locator('#space-basic-info').innerText()).includes(originalName), '取消后应恢复原名称')

    // 无改动直接保存：不发请求，安静退出编辑态。
    requests.length = 0
    await page.locator('#space-basic-info button:has-text("编辑空间信息")').click()
    await page.locator('#space-basic-info-name').waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('#space-basic-info button:has-text("保存修改")').click()
    await page.waitForTimeout(700)
    assert.equal(requests.filter(item => item.path === '/space/update').length, 0, '未修改时不得发出更新请求')
    assert.equal(page.url().includes('/space/setup'), true, '保存后必须留在设置页')
  } finally {
    await context.close()
  }
})

test('无空间账号看不到任何空间生命周期入口', async (t) => {
  if (!requireEnv(t)) return
  const { context, page } = await openPage({ width: 1440, height: 900 })
  try {
    await login(page, PARTNER)
    await page.goto(`${WEB_BASE}/space/setup`, { waitUntil: 'commit' })
    // 无空间账号落在创建 / 绑定分支；有空间账号落在设置面板概览。
    await page.waitForSelector('#space-create-heading, #space-overview', { timeout: 90000 })
    await sleep(500)
    assert.equal(await page.locator('#space-destroy').count(), 0, '无空间账号不得出现销毁入口')
    assert.equal(await page.locator('#space-unbind').count(), 0, '无空间账号不得出现解绑入口')
    assert.equal(await page.locator('#space-restore-heading').count(), 0, '无空间账号不得出现恢复入口')
  } finally {
    await context.close()
  }
})

test('旧入口 /space/settings 重定向到 /space/setup 并展示同一页面', async (t) => {
  if (!requireEnv(t)) return
  const { context, page } = await openPage({ width: 1440, height: 900 })
  try {
    await login(page, CREATOR)
    await page.goto(`${WEB_BASE}/space/settings?action=create#space-destroy`, { waitUntil: 'commit' })
    const destroyButton = page.locator('#space-destroy button')
    await destroyButton.waitFor({ state: 'visible', timeout: 90000 })
    assert.match(page.url(), /\/space\/setup\?action=create#space-destroy$/, '旧入口应保留 query 与 hash 重定向')
    assert.equal(await destroyButton.isVisible(), true)
  } finally {
    await context.close()
  }
})
