import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 情侣空间页入口参数（纯函数）测试。
 *
 * 覆盖：
 * - buildSpaceSetupUrl 的三种入口：create / bind / settings，以及无参数；
 * - settings 模式必须生成 ?mode=settings，且不能被旧参数覆盖；
 * - parseSpaceSetupQuery 的兼容性：只给 action、只给 mode、两个都给、非法值；
 * - 解析结果直接驱动页面视图模式，非法输入不得把页面带进设置模式。
 */

const route = await import('../miniprogram/utils/space-setup-route.js')
const { SPACE_SETUP_ROUTE } = await import('../miniprogram/utils/session-constants.js')

// ============================== 生成入口地址 ==============================

test('buildSpaceSetupUrl：create / bind 保持原有 ?action= 语义', () => {
  assert.equal(route.buildSpaceSetupUrl('create'), `${SPACE_SETUP_ROUTE}?action=create`)
  assert.equal(route.buildSpaceSetupUrl('bind'), `${SPACE_SETUP_ROUTE}?action=bind`)
})

test('buildSpaceSetupUrl：settings 生成 ?mode=settings', () => {
  assert.equal(route.buildSpaceSetupUrl('settings'), `${SPACE_SETUP_ROUTE}?mode=settings`)
  assert.ok(route.buildSpaceSetupUrl('settings').indexOf('mode=settings') !== -1)
})

test('buildSpaceSetupUrl：无参数 / 空字符串 / 非法值都回到无 query 的页面', () => {
  assert.equal(route.buildSpaceSetupUrl(), SPACE_SETUP_ROUTE)
  assert.equal(route.buildSpaceSetupUrl(''), SPACE_SETUP_ROUTE)
  assert.equal(route.buildSpaceSetupUrl(null), SPACE_SETUP_ROUTE)
  assert.equal(route.buildSpaceSetupUrl('destroy'), SPACE_SETUP_ROUTE)
  assert.equal(route.buildSpaceSetupUrl('SETTINGS'), `${SPACE_SETUP_ROUTE}?mode=settings`)
  assert.equal(route.buildSpaceSetupUrl('  bind  '), `${SPACE_SETUP_ROUTE}?action=bind`)
})

// ============================== 解析入口参数 ==============================

test('parseSpaceSetupQuery：兼容只有 ?action= 的旧入口', () => {
  const create = route.parseSpaceSetupQuery({ action: 'create' })
  assert.equal(create.mode, 'create')
  assert.equal(create.action, 'create')
  assert.equal(create.isSettings, false)

  const bind = route.parseSpaceSetupQuery({ action: 'bind' })
  assert.equal(bind.mode, 'bind')
  assert.equal(bind.isSettings, false)
})

test('parseSpaceSetupQuery：?mode=settings 进入设置模式', () => {
  const parsed = route.parseSpaceSetupQuery({ mode: 'settings' })
  assert.equal(parsed.mode, 'settings')
  assert.equal(parsed.isSettings, true)
  assert.equal(parsed.action, '')
})

test('parseSpaceSetupQuery：mode 优先于 action（分享链接同时带两个参数）', () => {
  const parsed = route.parseSpaceSetupQuery({ mode: 'settings', action: 'bind' })
  assert.equal(parsed.mode, 'settings')
  assert.equal(parsed.isSettings, true)
  assert.equal(parsed.action, 'bind')
})

test('parseSpaceSetupQuery：空 query / 非字符串参数不会误入设置模式', () => {
  const cases = [undefined, null, {}, { mode: '' }, { mode: ['settings'] }, { mode: { value: 'settings' } }, { mode: 'unknown' }]
  cases.forEach((query) => {
    const parsed = route.parseSpaceSetupQuery(query)
    assert.equal(parsed.mode, '', `query=${JSON.stringify(query)}`)
    assert.equal(parsed.isSettings, false, `query=${JSON.stringify(query)}`)
  })
})

test('parseSpaceSetupQuery：非法 mode 时仍按合法 action 解析', () => {
  const parsed = route.parseSpaceSetupQuery({ mode: 'nope', action: 'create' })
  assert.equal(parsed.mode, 'create')
  assert.equal(parsed.isSettings, false)
})

test('buildSpaceSetupUrl 与 parseSpaceSetupQuery 往返一致', () => {
  for (const action of ['create', 'bind', 'settings']) {
    const url = route.buildSpaceSetupUrl(action)
    const query = {}
    const queryString = url.split('?')[1] || ''
    queryString.split('&').filter(Boolean).forEach((pair) => {
      const [key, value] = pair.split('=')
      query[key] = value
    })
    const parsed = route.parseSpaceSetupQuery(query)
    assert.equal(parsed.mode, action, `${action} 往返后模式应一致`)
  }
})
