import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 用户状态与 Tab 展示规则测试（纯逻辑层）。
 *
 * 覆盖需求中的验收点：
 * - 未登录 / 已登录但无情侣空间 → 只能看到「恋爱广场」与「我的」；
 * - 已登录且存在情侣空间 → 完整 Tab；
 * - loading / error 状态不会泄露受限 Tab；
 * - 页面访问级别与受限页拦截目标正确。
 */

const {
  SESSION_STATUS,
  TAB_ID,
  MINIMAL_TAB_IDS,
  FULL_TAB_IDS,
  PAGE_ACCESS,
} = await import('../miniprogram/utils/session-constants.js')

const {
  deriveHasSpace,
  deriveSessionStatus,
  isLoggedInStatus,
  bucketOf,
  resolveVisibleTabIds,
  canOpenTab,
  resolvePageAccess,
  canAccessPage,
  resolveAccessRedirect,
  isWaitingForPartner,
  isValidSpaceId,
} = await import('../miniprogram/utils/session-rules.js')

const spaceWith = (overrides = {}) => ({ spaceId: 12, status: 1, ...overrides })

// ============================ 状态推导 ============================

test('未登录时状态为 unauthenticated，只展示两个 Tab', () => {
  const status = deriveSessionStatus({ token: '', space: null })
  assert.equal(status, SESSION_STATUS.UNAUTHENTICATED)
  assert.deepEqual(resolveVisibleTabIds(status), MINIMAL_TAB_IDS)
  assert.deepEqual(resolveVisibleTabIds(status), [TAB_ID.PLAZA, TAB_ID.PROFILE])
})

test('已登录但没有情侣空间（接口 data=null）只展示两个 Tab', () => {
  const status = deriveSessionStatus({ token: 'token-a', space: null })
  assert.equal(status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.deepEqual(resolveVisibleTabIds(status), [TAB_ID.PLAZA, TAB_ID.PROFILE])
})

test('已登录且存在情侣空间时展示完整 Tab，顺序与定义一致', () => {
  const status = deriveSessionStatus({ token: 'token-a', space: spaceWith() })
  assert.equal(status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
  assert.deepEqual(resolveVisibleTabIds(status), FULL_TAB_IDS)
  assert.deepEqual(FULL_TAB_IDS, ['plaza', 'story', 'photo', 'home', 'message', 'profile'])
})

test('空间状态查询失败时进入 error，且不暴露受限 Tab', () => {
  const status = deriveSessionStatus({ token: 'token-a', space: spaceWith(), spaceError: '网络异常' })
  assert.equal(status, SESSION_STATUS.ERROR)
  assert.deepEqual(resolveVisibleTabIds(status), [TAB_ID.PLAZA, TAB_ID.PROFILE])
})

test('登录态校验失败时进入 error，不因为上次有空间就放行', () => {
  const status = deriveSessionStatus({ token: 'token-a', space: spaceWith(), authError: '登录状态确认失败' })
  assert.equal(status, SESSION_STATUS.ERROR)
  assert.ok(resolveVisibleTabIds(status).indexOf(TAB_ID.HOME) === -1)
})

test('loading 状态不返回任何需要情侣空间的 Tab', () => {
  const visible = resolveVisibleTabIds(SESSION_STATUS.LOADING)
  assert.deepEqual(visible, [TAB_ID.PLAZA, TAB_ID.PROFILE])
})

test('已解绑空间（status=5）不再算拥有情侣空间', () => {
  assert.equal(deriveHasSpace(spaceWith({ status: 5 })), false)
  const status = deriveSessionStatus({ token: 'token-a', space: spaceWith({ status: 5 }) })
  assert.equal(status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.deepEqual(resolveVisibleTabIds(status), [TAB_ID.PLAZA, TAB_ID.PROFILE])
})

test('等待绑定（status=0）算拥有情侣空间，可以邀请另一半', () => {
  const waiting = spaceWith({ status: 0, memberCount: 1 })
  assert.equal(deriveHasSpace(waiting), true)
  assert.equal(isWaitingForPartner(waiting), true)
  assert.equal(
    deriveSessionStatus({ token: 'token-a', space: waiting }),
    SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
  )
})

test('无效 spaceId 不会被当成拥有空间', () => {
  assert.equal(isValidSpaceId(0), false)
  assert.equal(isValidSpaceId(-1), false)
  assert.equal(isValidSpaceId('abc'), false)
  assert.equal(isValidSpaceId(undefined), false)
  assert.equal(isValidSpaceId('15'), true)
  assert.equal(deriveHasSpace({ status: 1 }), false)
  assert.equal(deriveHasSpace(null), false)
})

test('状态分组与登录判定一致', () => {
  assert.equal(bucketOf(SESSION_STATUS.UNAUTHENTICATED), 'guest')
  assert.equal(bucketOf(SESSION_STATUS.LOADING), 'loading')
  assert.equal(bucketOf(SESSION_STATUS.ERROR), 'logged_in_no_space')
  assert.equal(bucketOf(SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE), 'logged_in_no_space')
  assert.equal(bucketOf(SESSION_STATUS.AUTHENTICATED_WITH_SPACE), 'logged_in_with_space')

  assert.equal(isLoggedInStatus(SESSION_STATUS.UNAUTHENTICATED), false)
  assert.equal(isLoggedInStatus(SESSION_STATUS.LOADING), false)
  assert.equal(isLoggedInStatus(SESSION_STATUS.ERROR), true)
})

// ============================ Tab 点击 ============================

test('依赖情侣空间的 Tab 在无空间状态下不可点击', () => {
  for (const tabId of [TAB_ID.HOME, TAB_ID.STORY, TAB_ID.PHOTO, TAB_ID.MESSAGE]) {
    assert.equal(canOpenTab(tabId, SESSION_STATUS.UNAUTHENTICATED), false, tabId)
    assert.equal(canOpenTab(tabId, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE), false, tabId)
    assert.equal(canOpenTab(tabId, SESSION_STATUS.ERROR), false, tabId)
    assert.equal(canOpenTab(tabId, SESSION_STATUS.LOADING), false, tabId)
    assert.equal(canOpenTab(tabId, SESSION_STATUS.AUTHENTICATED_WITH_SPACE), true, tabId)
  }
  assert.equal(canOpenTab(TAB_ID.PLAZA, SESSION_STATUS.UNAUTHENTICATED), true)
  assert.equal(canOpenTab(TAB_ID.PROFILE, SESSION_STATUS.UNAUTHENTICATED), true)
})

// ============================ 页面访问级别 ============================

test('公开页面在任何状态下可访问', () => {
  for (const route of [
    'pages/plaza/index',
    'pages/plaza-detail/index',
    // 公开故事 / 照片详情：他人在恋爱广场公开的内容，匿名访客同样可达
    'pages/plaza-story/plaza-story',
    'pages/plaza-photo/plaza-photo',
    'pages/profile/profile',
  ]) {
    assert.equal(resolvePageAccess(route), PAGE_ACCESS.PUBLIC, route)
    assert.equal(canAccessPage(PAGE_ACCESS.PUBLIC, SESSION_STATUS.UNAUTHENTICATED), true)
    assert.equal(canAccessPage(PAGE_ACCESS.PUBLIC, SESSION_STATUS.LOADING), true)
  }
})

test('受限页面在 loading / 未登录 / 无空间 / error 下均不可访问', () => {
  for (const route of [
    'pages/index/index',
    'pages/story/story',
    'pages/story-detail/story-detail',
    'pages/photo/photo',
    'pages/photo-detail/photo-detail',
    'pages/message/message',
  ]) {
    assert.equal(resolvePageAccess(route), PAGE_ACCESS.SPACE, route)
    assert.equal(canAccessPage(PAGE_ACCESS.SPACE, SESSION_STATUS.LOADING), false, route)
    assert.equal(canAccessPage(PAGE_ACCESS.SPACE, SESSION_STATUS.UNAUTHENTICATED), false, route)
    assert.equal(canAccessPage(PAGE_ACCESS.SPACE, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE), false, route)
    assert.equal(canAccessPage(PAGE_ACCESS.SPACE, SESSION_STATUS.ERROR), false, route)
    assert.equal(canAccessPage(PAGE_ACCESS.SPACE, SESSION_STATUS.AUTHENTICATED_WITH_SPACE), true, route)
  }
})

test('路由带 query 或前导斜杠时仍能识别访问级别', () => {
  assert.equal(resolvePageAccess('/pages/story/story?from=share'), PAGE_ACCESS.SPACE)
  assert.equal(resolvePageAccess('pages/photo-detail/photo-detail?id=9'), PAGE_ACCESS.SPACE)
  assert.equal(resolvePageAccess('/pages/profile/profile?guide=space'), PAGE_ACCESS.PUBLIC)
})

test('未声明的页面按 AUTH 兜底（宁可要求登录也不误放行）', () => {
  assert.equal(resolvePageAccess('pages/unknown/index'), PAGE_ACCESS.AUTH)
  assert.equal(canAccessPage(PAGE_ACCESS.AUTH, SESSION_STATUS.UNAUTHENTICATED), false)
  assert.equal(canAccessPage(PAGE_ACCESS.AUTH, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE), true)
})

// ============================ 拦截目标 ============================

test('未登录访问受限页跳「我的」并提示登录', () => {
  const redirect = resolveAccessRedirect(SESSION_STATUS.UNAUTHENTICATED)
  assert.ok(redirect.url.indexOf('/pages/profile/profile') === 0)
  assert.ok(redirect.url.indexOf('guide=login') !== -1)
  assert.ok(redirect.notice.length > 0)
})

test('已登录但无空间 / 状态异常访问受限页跳「我的」并提示创建绑定', () => {
  for (const status of [SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE, SESSION_STATUS.ERROR]) {
    const redirect = resolveAccessRedirect(status)
    assert.ok(redirect.url.indexOf('/pages/profile/profile') === 0, status)
    assert.ok(redirect.url.indexOf('guide=space') !== -1, status)
    assert.ok(/情侣空间/.test(redirect.notice), status)
  }
})
