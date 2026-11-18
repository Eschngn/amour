/**
 * 浏览器验收脚本（仅本地验收，不进入构建产物）。
 *
 * 验证 Web 端「情侣空间创建」的恋爱开始时间选择器：
 * 1. 打开面板点「此刻」后「确定」可用，且输入框值与点击时刻一致；
 * 2. 页面停留一段时间（max-date 快照已过期）后点「此刻」仍可确认 —— 修复前这里是禁用态；
 * 3. 手动选择过去日期仍能确认并写入，值不变；
 * 4. 未来日期仍为禁用态（边界校验没有因为修复被移除）。
 *
 * 用法：
 *   BASE_URL=http://localhost:5211 node scripts/verify-love-start-picker.cjs
 */
const { chromium } = require('playwright-core')

const BASE = process.env.BASE_URL || 'http://localhost:5211'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const MENU = '.love-start-picker .dp--menu'
const SELECT_BTN = '.love-start-picker [data-test-id="select-button"]'
const NOW_BTN = '.love-start-picker .dp--action-button'

/** 只拦截真正的后端接口请求（不能拦 /src/api/ 模块地址）。 */
function isApiRequest(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/')
}

/** 本次验收里后端收到的创建请求体（用于核对提交值）。 */
const createdPayloads = []

const FRONTEND_PERMISSIONS = [
  'frontend:story:query',
  'frontend:photo:query',
  'frontend:message:query',
  'frontend:anniversary:query',
]

async function mockApi(page) {
  await page.route(isApiRequest, async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/api/, '')
    const json = (payload) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })

    if (path === '/login/status') return json({ success: true, data: true })
    if (path === '/user/profile') {
      return json({
        success: true,
        data: {
          username: 'tester',
          displayName: '测试用户',
          avatar: '',
          passwordSet: false,
          permissions: FRONTEND_PERMISSIONS,
        },
      })
    }
    // 没有情侣空间：同时渲染创建表单。
    if (path === '/space/status') return json({ success: true, data: null })
    // 记录创建请求体，用于校验表单实际提交的 loveStartTime。
    if (path === '/space/create') {
      createdPayloads.push(route.request().postDataJSON?.() || {})
      return json({ success: true, data: null })
    }
    if (path === '/space/invitation/received') return json({ success: true, data: [] })
    if (path === '/gallery/spaces') {
      return json({ success: true, data: { current: 1, size: 9, total: 0, records: [] } })
    }
    if (path === '/analytics/page-view') return json({ success: true, data: null })
    return json({ success: true, data: null })
  })
}

async function login(page) {
  await page.addInitScript((permissions) => {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      storage.setItem('amour_token', 'test-token')
      storage.setItem('amour_permissions', JSON.stringify(permissions))
    }
  }, FRONTEND_PERMISSIONS)
}

async function openSetup(page) {
  await page.goto(`${BASE}/space/setup?action=create`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#setup-love-start', { timeout: 15000 })
}

async function openPicker(page) {
  await page.locator('#setup-love-start').click()
  await page.waitForSelector(MENU, { state: 'visible' })
}

/** 读取选择器状态；menuOpen 以面板是否仍挂在 DOM 上为准（关闭后会整体移除）。 */
async function pickerView(page) {
  return page.evaluate(() => {
    const select = document.querySelector('.love-start-picker [data-test-id="select-button"]')
    const input = document.querySelector('#setup-love-start')
    const preview = document.querySelector('.love-start-picker .dp--selection-preview')
    return {
      inputValue: input ? input.value : null,
      selectDisabled: select ? select.disabled : null,
      menuOpen: Boolean(document.querySelector('.love-start-picker .dp--menu')),
      preview: preview ? preview.textContent.trim() : null,
      ariaExpanded: input ? input.getAttribute('aria-expanded') : null,
    }
  })
}

/** 点「此刻」并确认，返回点击前后的选择器状态。 */
async function clickNowAndConfirm(page) {
  await page.locator(NOW_BTN, { hasText: '此刻' }).click()
  await page.waitForTimeout(150)
  const afterNow = await pickerView(page)
  await page.locator(SELECT_BTN).click()
  await page.waitForSelector(MENU, { state: 'detached', timeout: 3000 }).catch(() => {})
  return { afterNow, afterConfirm: await pickerView(page) }
}

function parsePickerValue(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(String(value || ''))
  if (!matched) return null
  return new Date(
    Number(matched[1]),
    Number(matched[2]) - 1,
    Number(matched[3]),
    Number(matched[4]),
    Number(matched[5]),
  )
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const results = []
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` :: ${JSON.stringify(detail)}`}`)
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: 'Asia/Shanghai',
    })
    const page = await context.newPage()
    await login(page)
    await mockApi(page)

    // ---------- 场景 1：直接点「此刻」后可确认 ----------
    {
      await openSetup(page)
      const nowBefore = await page.evaluate(() => Date.now())
      await openPicker(page)
      const { afterNow, afterConfirm } = await clickNowAndConfirm(page)
      const nowAfter = await page.evaluate(() => Date.now())

      check('场景1 点「此刻」后「确定」可点击', afterNow.selectDisabled === false, afterNow)
      check('场景1 确认后面板关闭', afterConfirm.menuOpen === false, afterConfirm)

      const picked = parsePickerValue(afterConfirm.inputValue)
      check('场景1 输入框显示 yyyy-MM-dd HH:mm', picked !== null, afterConfirm.inputValue)
      check(
        '场景1 提交值与点击时刻一致（±2 分钟内）',
        picked !== null && picked.getTime() >= nowBefore - 2 * 60 * 1000 && picked.getTime() <= nowAfter + 2 * 60 * 1000,
        { value: afterConfirm.inputValue, nowBefore, nowAfter },
      )
      // 提交一次创建，核对表单实际保存的 loveStartTime 与控件选中的时间一致。
      await page.locator('#setup-space-name').fill('验收空间')
      createdPayloads.length = 0
      await page.getByRole('button', { name: '创建情侣空间' }).click()
      await page.waitForTimeout(600)
      const sent = createdPayloads[0] || {}
      const expected = picked
        ? `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')} `
          + `${String(picked.getHours()).padStart(2, '0')}:${String(picked.getMinutes()).padStart(2, '0')}:00`
        : null
      check('场景1 提交值 = 控件显示值（补秒，遵循项目约定）', sent.loveStartTime === expected, {
        sent: sent.loveStartTime,
        expected,
        control: afterConfirm.inputValue,
      })
    }

    // ---------- 场景 2：停留 42 分钟（上限快照已过期）后点「此刻」仍可确认 ----------
    {
      await openSetup(page)
      const clock = page.clock
      await clock.install({ time: new Date() })
      await clock.fastForward('42:00')

      await openPicker(page)
      const { afterNow, afterConfirm } = await clickNowAndConfirm(page)

      check('场景2 停留 42 分钟后「确定」仍可点击', afterNow.selectDisabled === false, afterNow)
      check('场景2 确认后面板关闭', afterConfirm.menuOpen === false, afterConfirm)

      const picked = parsePickerValue(afterConfirm.inputValue)
      const pageNow = await page.evaluate(() => Date.now())
      check(
        '场景2 保存的是推进后的当前时间',
        picked !== null && Math.abs(picked.getTime() - pageNow) <= 2 * 60 * 1000,
        { value: afterConfirm.inputValue, pageNow },
      )
    }

    // ---------- 场景 2b：面板已打开后时间继续推进，再点「此刻」也应可确认 ----------
    {
      await openSetup(page)
      const clock = page.clock
      await clock.install({ time: new Date() })
      await openPicker(page)
      // 面板一直开着，5 分钟后再点「此刻」：此时打开面板时的上限也已经过期。
      await clock.fastForward('05:00')
      const { afterNow, afterConfirm } = await clickNowAndConfirm(page)

      check('场景2b 面板打开后停留 5 分钟，「确定」仍可点击', afterNow.selectDisabled === false, afterNow)
      check('场景2b 确认后面板关闭', afterConfirm.menuOpen === false, afterConfirm)

      const picked = parsePickerValue(afterConfirm.inputValue)
      const pageNow = await page.evaluate(() => Date.now())
      check(
        '场景2b 保存的是点击时刻的当前时间',
        picked !== null && Math.abs(picked.getTime() - pageNow) <= 2 * 60 * 1000,
        { value: afterConfirm.inputValue, pageNow },
      )
    }

    // ---------- 场景 3：手动选择过去日期仍正常 ----------
    {
      await openSetup(page)
      await openPicker(page)
      const target = await page.evaluate(() => {
        const selectable = [...document.querySelectorAll('.love-start-picker .dp--calendar-item')]
          .filter((item) => item.firstElementChild
            && !item.firstElementChild.className.includes('dp--cell-disabled')
            && !item.firstElementChild.className.includes('dp--cell-offset'))
        if (!selectable.length) return null
        const today = new Date()
        const past = selectable.filter((item) => {
          const day = Number(item.textContent.trim())
          return Number.isFinite(day) && day < today.getDate()
        })
        const picked = past[0] || selectable[0]
        return { id: picked.id, day: picked.textContent.trim() }
      })
      check('场景3 面板存在可点的过去日期', Boolean(target), target)

      if (target) {
        await page.locator(`[data-test-id="${target.id}"]`).click()
        await page.waitForTimeout(150)
        const beforeConfirm = await pickerView(page)
        check('场景3 手动选日期后「确定」可点击', beforeConfirm.selectDisabled === false, beforeConfirm)

        await page.locator(SELECT_BTN).click()
        await page.waitForSelector(MENU, { state: 'detached', timeout: 3000 }).catch(() => {})
        const afterConfirm = await pickerView(page)
        const picked = parsePickerValue(afterConfirm.inputValue)
        check('场景3 手动选择后写入 yyyy-MM-dd HH:mm', picked !== null, afterConfirm.inputValue)
        check('场景3 选中的日期与写入的日期一致', picked !== null && String(picked.getDate()) === target.day, {
          target,
          value: afterConfirm.inputValue,
        })
      }
    }

    // ---------- 场景 4：未来日期仍是禁用态（边界校验未被移除） ----------
    {
      await openSetup(page)
      await openPicker(page)
      const future = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.love-start-picker .dp--calendar-item')]
        const today = new Date()
        const futureItems = items.filter((item) => {
          if (!item.id || !/^dp-\d{4}-\d{2}-\d{2}$/.test(item.id)) return false
          const day = Number(item.textContent.trim())
          if (!Number.isFinite(day) || day <= today.getDate()) return false
          const [, month] = item.id.split('-').slice(1).map(Number)
          return month === today.getMonth() + 1
        })
        if (!futureItems.length) return null
        return {
          total: futureItems.length,
          allDisabled: futureItems.every((item) => item.getAttribute('aria-disabled') === 'true'
            || (item.firstElementChild && item.firstElementChild.className.includes('dp--cell-disabled'))),
          firstId: futureItems[0].id,
        }
      })
      check('场景4 未来日期全部为禁用态', future?.allDisabled === true, future)

      // 点击未来日期不应写入值、也不应让「确定」可用后把未来时间保存下来。
      if (future?.firstId) {
        await page.locator(`[data-test-id="${future.firstId}"]`).click({ force: true })
        await page.waitForTimeout(150)
        const after = await pickerView(page)
        const picked = parsePickerValue(after.inputValue)
        const now = await page.evaluate(() => Date.now())
        check(
          '场景4 点击未来日期不会保存未来时间',
          after.inputValue === '' || after.selectDisabled === true || (picked !== null && picked.getTime() <= now + 60 * 1000),
          { value: after.inputValue, selectDisabled: after.selectDisabled, now },
        )
      }
    }

    await page.screenshot({ path: '/tmp/amour-love-start-picker.png', fullPage: false })
    await context.close()
  } finally {
    await browser.close()
  }

  const failed = results.filter((item) => !item.ok)
  console.log(`\n结果：${results.length - failed.length}/${results.length} 通过`)
  if (failed.length) {
    console.log('失败项：')
    failed.forEach((item) => console.log(` - ${item.name} :: ${JSON.stringify(item.detail)}`))
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error('验收脚本异常', error)
  process.exit(1)
})
