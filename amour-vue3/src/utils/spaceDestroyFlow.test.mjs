import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DESTROY_OUTCOME,
  buildDestroyConfirmRequest,
  runDestroySpace,
} from './spaceDestroyFlow.js'
import {
  DESTROY_REFRESH_FAILED_MESSAGE,
  DESTROY_SPACE_STILL_PRESENT_MESSAGE,
} from './spaceDestroy.js'

/**
 * 运行：npm test（或 node --test src/utils/spaceDestroyFlow.test.mjs）
 *
 * 覆盖任务「五、Web 和小程序销毁交互」中无法用源码断言证明的**行为**：
 * - 取消确认不发请求；
 * - 连续点击 / 并发触发只发一次请求；
 * - 确认后才发请求，请求体绑定当前展示的空间；
 * - 服务端成功后必须先强制刷新，再按刷新结果决定；
 * - 刷新失败不得报成「销毁失败」，也不得自动重发；
 * - 只有确认无空间才清缓存 / 清共享状态 / 跳转，且不清登录态；
 * - 任意路径都释放提交锁（不会把页面锁死）。
 *
 * 用注入依赖的真实控制流验证，不做字符串匹配。
 */

/** 构造一套可观测的依赖桩；返回值同时记录调用顺序与次数。 */
function createHarness(options = {}) {
  const calls = []
  const state = {
    busy: options.busy || '',
    space: options.space ?? { spaceId: 3001, status: 1, spaceName: '测试空间', revision: 3 },
    spaceAfterRefresh: options.spaceAfterRefresh ?? null,
    spaceErrorAfterRefresh: options.spaceErrorAfterRefresh ?? '',
    confirmImpl: options.confirmImpl || (() => Promise.resolve()),
    response: options.response ?? { data: { success: true, data: { destroyed: true } } },
    requestError: options.requestError ?? null,
    canDestroy: options.canDestroy !== false,
  }

  const deps = {
    canDestroyNow: () => {
      calls.push('canDestroyNow')
      return state.canDestroy
    },
    readBusyAction: () => {
      calls.push('readBusyAction')
      return state.busy
    },
    setBusyAction: (action) => {
      calls.push(`setBusyAction:${action}`)
      state.busy = action
    },
    readSpace: () => {
      calls.push('readSpace')
      return state.space
    },
    confirmPrompt: async () => {
      calls.push('confirmPrompt')
      return state.confirmImpl()
    },
    requestDestroy: async (space) => {
      calls.push(`requestDestroy:${space && space.spaceId}`)
      if (state.requestError) throw state.requestError
      return state.response
    },
    refreshStatus: async () => {
      calls.push('refreshStatus')
    },
    readSpaceAfterRefresh: () => {
      calls.push('readSpaceAfterRefresh')
      return state.spaceAfterRefresh
    },
    readSpaceErrorAfterRefresh: () => state.spaceErrorAfterRefresh,
    clearCache: () => calls.push('clearCache'),
    clearStatus: () => calls.push('clearStatus'),
    notify: (message, kind) => calls.push(`notify:${kind}:${message}`),
    navigate: async (path) => calls.push(`navigate:${path}`),
  }
  return { calls, state, deps, count: name => calls.filter(c => c === name).length }
}

// ============================== 取消确认 ==============================

test('取消二次确认：不发销毁请求、不刷新、不清状态、不跳转', async () => {
  const h = createHarness({
    // ElMessageBox.prompt 取消 / 关闭时抛错，与真实行为一致。
    confirmImpl: () => Promise.reject(new Error('cancel')),
  })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.CANCELLED)
  assert.equal(h.count('requestDestroy:3001'), 0, '取消后绝不能发出销毁请求')
  assert.equal(h.count('refreshStatus'), 0, '取消后不应刷新状态')
  assert.equal(h.count('clearCache'), 0, '取消后不得清理缓存')
  assert.equal(h.count('clearStatus'), 0, '取消后不得清空共享状态')
  assert.equal(h.count('navigate:/plaza'), 0, '取消后不得跳转')
  // 提交锁必须被释放，否则用户之后再也点不动按钮。
  assert.equal(h.state.busy, '', '取消后必须释放提交锁')
  assert.deepEqual(
    h.calls.filter(c => c.startsWith('setBusyAction')),
    ['setBusyAction:destroy', 'setBusyAction:'],
  )
})

test('取消后仍可再次发起销毁（提交锁没有泄漏）', async () => {
  const h = createHarness({ confirmImpl: () => Promise.reject(new Error('cancel')) })
  await runDestroySpace(h.deps)
  assert.equal(h.state.busy, '')

  h.state.confirmImpl = () => Promise.resolve()
  h.state.spaceAfterRefresh = null
  const outcome = await runDestroySpace(h.deps)
  assert.equal(outcome, DESTROY_OUTCOME.COMPLETED)
  assert.equal(h.count('requestDestroy:3001'), 1, '第二次尝试应正常发出请求')
})

// ============================== 连续点击 / 并发 ==============================

test('待确认期间再次点击：直接跳过，不会打开第二个确认框', async () => {
  let releaseConfirm
  const confirmBarrier = new Promise((resolve) => { releaseConfirm = resolve })
  const h = createHarness({
    confirmImpl: () => confirmBarrier.then(() => Promise.reject(new Error('cancel'))),
  })

  const first = runDestroySpace(h.deps)
  await Promise.resolve()
  // 第一次已占锁且正在等确认框，第二次点击必须被挡住。
  const second = await runDestroySpace(h.deps)

  assert.equal(second, DESTROY_OUTCOME.SKIPPED, '待确认期间的重复点击必须被跳过')
  assert.equal(h.count('confirmPrompt'), 1, '不得打开第二个确认框')
  assert.equal(h.count('requestDestroy:3001'), 0)

  releaseConfirm()
  await first
  assert.equal(h.count('confirmPrompt'), 1)
})

test('并发触发多次销毁：只发出一次请求', async () => {
  const h = createHarness({
    confirmImpl: () => new Promise(resolve => setTimeout(resolve, 5)),
  })
  h.state.spaceAfterRefresh = null

  const results = await Promise.all([
    runDestroySpace(h.deps),
    runDestroySpace(h.deps),
    runDestroySpace(h.deps),
  ])

  assert.equal(h.count('requestDestroy:3001'), 1, '并发销毁只能发一次请求')
  assert.equal(results.filter(r => r === DESTROY_OUTCOME.COMPLETED).length, 1)
  assert.equal(results.filter(r => r === DESTROY_OUTCOME.SKIPPED).length, 2)
  assert.equal(h.state.busy, '', '全部结束后提交锁必须释放')
})

test('已有其它写操作进行中（busyAction 非空）：直接跳过且不打开确认框', async () => {
  const h = createHarness({ busy: 'visibility' })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.SKIPPED)
  assert.equal(h.count('confirmPrompt'), 0)
  assert.equal(h.count('requestDestroy:3001'), 0)
  assert.equal(h.state.busy, 'visibility', '不得覆盖已有的写操作锁')
})

test('当前不允许销毁（另一半已加入）：跳过且不打开确认框', async () => {
  const h = createHarness({ canDestroy: false })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.SKIPPED)
  assert.equal(h.count('confirmPrompt'), 0)
  assert.equal(h.count('requestDestroy:3001'), 0)
  assert.equal(h.state.busy, '', '前置条件不满足时不得占锁')
})

// ============================== 请求体绑定 ==============================

test('请求体使用当前页面展示的空间（绑定销毁目标）', async () => {
  const h = createHarness()
  h.state.space = { spaceId: 4321, status: 0, revision: 9 }
  h.state.spaceAfterRefresh = null
  await runDestroySpace(h.deps)

  assert.equal(h.count('requestDestroy:4321'), 1, '必须把当前展示空间的 spaceId 传给请求层')
})

// ============================== 服务端结果分支 ==============================

test('服务端成功后必须先强制刷新，再判定结局，最后才清缓存并跳转', async () => {
  const h = createHarness()
  h.state.spaceAfterRefresh = null
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.COMPLETED)
  const order = h.calls.filter(c => [
    'confirmPrompt', 'requestDestroy:3001', 'refreshStatus',
    'readSpaceAfterRefresh', 'clearCache', 'clearStatus', 'navigate:/plaza',
  ].includes(c))
  assert.deepEqual(order, [
    'confirmPrompt',
    'requestDestroy:3001',
    'refreshStatus',
    'readSpaceAfterRefresh',
    'clearCache',
    'clearStatus',
    'navigate:/plaza',
  ], '顺序必须是：确认 → 请求 → 强制刷新 → 判定 → 清缓存 → 清状态 → 跳转')
  assert.equal(h.state.busy, '')
})

test('刷新失败：提示重新读取，不报「销毁失败」、不清缓存、不跳转、不重发请求', async () => {
  const h = createHarness({ spaceErrorAfterRefresh: '网络异常' })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.REFRESH_FAILED)
  assert.equal(h.count('requestDestroy:3001'), 1, '不得自动重发已成功提交的销毁请求')
  assert.equal(h.count('clearCache'), 0, '刷新失败时不得清理缓存')
  assert.equal(h.count('clearStatus'), 0, '刷新失败时不得清空共享状态')
  assert.equal(h.count('navigate:/plaza'), 0, '刷新失败时不得跳转')

  const notifications = h.calls.filter(c => c.startsWith('notify:'))
  assert.deepEqual(notifications, [`notify:warning:${DESTROY_REFRESH_FAILED_MESSAGE}`])
  assert.equal(
    notifications.some(n => /销毁失败/.test(n)),
    false,
    '刷新失败不能被报成「销毁失败」',
  )
})

test('刷新后服务端仍返回空间：展示真实状态，不伪造已销毁、不清状态、不跳转', async () => {
  const h = createHarness({ spaceAfterRefresh: { spaceId: 3001, status: 1 } })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.SPACE_STILL_PRESENT)
  assert.equal(h.count('clearStatus'), 0, '服务端仍返回空间时不得清空共享状态')
  assert.equal(h.count('navigate:/plaza'), 0, '不得跳转，页面应停留在真实状态')
  assert.deepEqual(
    h.calls.filter(c => c.startsWith('notify:')),
    [`notify:warning:${DESTROY_SPACE_STILL_PRESENT_MESSAGE}`],
  )
})

test('服务端业务拒绝（另一半已加入）：提示原因并强制刷新，不清理不跳转', async () => {
  const h = createHarness({
    response: { data: { success: false, errorCode: '20094', message: '另一半已加入' } },
  })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.REJECTED)
  assert.equal(h.count('refreshStatus'), 1, '状态类拒绝必须强制刷新')
  assert.equal(h.count('clearCache'), 0)
  assert.equal(h.count('navigate:/plaza'), 0)
  assert.equal(
    h.calls.some(c => c.startsWith('notify:error:') && /另一半已经加入/.test(c)),
    true,
    '必须给出可理解的原因',
  )
})

test('服务端拒绝但不是状态冲突（例如参数错误）：提示但不强制刷新', async () => {
  const h = createHarness({
    response: { data: { success: false, errorCode: '10001', message: '参数错误' } },
  })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.REJECTED)
  assert.equal(h.count('refreshStatus'), 0, '非状态类错误不需要刷新')
  assert.equal(h.calls.some(c => c.startsWith('notify:error:')), true)
})

test('目标空间已变化（20103）：提示准确信息并强制刷新', async () => {
  const h = createHarness({
    response: { data: { success: false, errorCode: '20103', message: '目标已变化' } },
  })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.REJECTED)
  assert.equal(h.count('refreshStatus'), 1)
  assert.equal(
    h.calls.some(c => c.startsWith('notify:error:') && /已变化|刷新/.test(c)),
    true,
  )
})

test('网络异常（响应丢失）：提示后不自动重发，且释放提交锁', async () => {
  const h = createHarness({ requestError: new Error('Network Error') })
  const outcome = await runDestroySpace(h.deps)

  assert.equal(outcome, DESTROY_OUTCOME.FAILED)
  assert.equal(h.count('requestDestroy:3001'), 1, '网络异常后不得自动重发')
  assert.equal(h.count('clearCache'), 0)
  assert.equal(h.count('navigate:/plaza'), 0)
  assert.equal(h.state.busy, '', '异常后必须释放提交锁，否则用户无法重试')
})

test('跳转失败不会把提交锁永久占用', async () => {
  const h = createHarness()
  h.state.spaceAfterRefresh = null
  h.deps.navigate = async () => { throw new Error('navigation aborted') }

  await assert.rejects(() => runDestroySpace(h.deps))
  assert.equal(h.state.busy, '', '跳转异常时仍必须释放提交锁')
  // 此时缓存与共享状态已经清理，属于「已确认销毁」的合理终态。
  assert.equal(h.count('clearCache'), 1)
  assert.equal(h.count('clearStatus'), 1)
})

// ============================== 确认框定义唯一来源 ==============================

test('确认框选项来自唯一来源，文案说明后果且要求逐字输入', () => {
  const request = buildDestroyConfirmRequest({ spaceId: 3001, spaceName: '我们的小空间' })
  assert.match(request.message, /我们的小空间/)
  assert.match(request.message, /另一半都不可见/)
  assert.match(request.message, /无法自行恢复/)
  assert.match(request.message, /平台管理员可以协助恢复/)
  // Web 端校验通过返回 true（Element Plus inputValidator 约定），失败返回错误文案。
  assert.equal(request.options.inputValidator('销毁'), true)
  assert.equal(typeof request.options.inputValidator('取消'), 'string')
  assert.equal(request.options.distinguishCancelAndClose, true)
})
