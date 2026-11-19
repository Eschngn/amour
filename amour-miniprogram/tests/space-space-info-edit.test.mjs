import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 空间设置页「空间基础信息编辑」页面级测试。
 *
 * 真实加载 pages/space-setup/index.js（不匹配源码字符串），用最小的 wx / Page 桩驱动：
 * 1. 回填（名称 / 简介 / 恋爱开始时间）；
 * 2. 编辑 → 保存：请求体三字段显式提交，且只改名称 / 简介时保留原始秒数；
 * 3. 清空时间提交 null（不是空字符串）；
 * 4. 取消（含草稿时的二次确认）不发请求并恢复服务端数据；
 * 5. 无修改不提交、重复点击只发一次请求；
 * 6. 名称 30 / 简介 500 长度校验；
 * 7. 原生日期 / 时间 picker 事件真实触发；
 * 8. 保存成功 → /space/update 1 次 + /space/status 刷新 + 展示更新 + 留在设置页；
 * 9. 保存失败保留输入；保存成功但 status 失败 → 独立提示 + 只重试同步；
 * 10. 另一半并发加入被拒（20064）→ 提示 + 刷新 + 转只读；
 * 11. 页面卸载后异步返回不 setData、不 toast；
 * 12. 同一空间的后台刷新不覆盖编辑中的草稿。
 */

const storage = new Map()
const requests = []
const handlers = new Map()
const toasts = []
const navigations = []
let pageOptions = null
let currentPages = [{ route: 'pages/profile/profile', options: {} }, { route: 'pages/space-setup/index', options: {} }]

function normalizePath(url) {
  return String(url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '')
}

/** 二次确认弹窗队列：队列为空时默认『取消』，避免测试意外触发写操作。 */
const modalResults = []
let modalCalls = []

function installWx() {
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
    getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key),
    request(options) {
      const path = normalizePath(options.url)
      requests.push({ path, data: options.data })
      const handler = handlers.get(path)
      if (!handler) {
        options.success({ statusCode: 200, data: { success: true, data: null } })
        return
      }
      handler(options)
    },
    login(options) {
      if (options && options.success) options.success({ code: 'mock-wechat-code' })
    },
    showToast(options) {
      toasts.push(options && options.title)
    },
    showModal(options) {
      modalCalls.push(options)
      const result = modalResults.shift()
      const outcome = result === undefined ? { confirm: false, cancel: true } : result
      const callback = options && typeof options.success === 'function' ? options.success : null
      // 真实 wx.showModal 是异步回调，测试里也异步触发。
      if (callback) queueMicrotask(() => callback(outcome))
    },
    reLaunch(options) {
      navigations.push({ type: 'reLaunch', url: options && options.url })
    },
    navigateTo(options) {
      navigations.push({ type: 'navigateTo', url: options && options.url })
    },
    redirectTo(options) {
      navigations.push({ type: 'redirectTo', url: options && options.url })
    },
    navigateBack(options) {
      navigations.push({ type: 'navigateBack', url: 'back' })
      if (currentPages.length <= 1 && options && options.fail) options.fail({ errMsg: 'navigateBack:fail' })
    },
    setClipboardData(options) {
      if (options && options.success) options.success({})
    },
  }
}

installWx()

globalThis.getApp = () => ({ globalData: {} })
globalThis.getCurrentPages = () => currentPages
globalThis.Page = (options) => {
  pageOptions = options
}

const sessionState = await import('../miniprogram/utils/session-state.js')
const { SESSION_STATUS, SPACE_STATUS } = await import('../miniprogram/utils/session-constants.js')
await import('../miniprogram/pages/space-setup/index.js')

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function fail500() {
  return { statusCode: 500, data: { success: false, message: '服务异常' } }
}

function bizError(errorCode, message) {
  return { statusCode: 200, data: { success: false, errorCode, message } }
}

/** 等待另一半加入的空间（status=0，创建者本人），带简介与秒级时间。 */
const WAITING_SPACE = {
  spaceId: 101,
  status: SPACE_STATUS.WAITING,
  spaceName: '我们的故事',
  description: '从这里开始',
  loveStartTime: '2024-05-20 19:30:47',
  memberCount: 1,
  creator: true,
  canInvite: true,
  revision: 1,
}

/** 另一半已加入的正常空间（status=1）。 */
const NORMAL_SPACE = {
  spaceId: 101,
  status: SPACE_STATUS.NORMAL,
  spaceName: '我们的故事',
  description: '从这里开始',
  loveStartTime: '2024-05-20 19:30:47',
  memberCount: 2,
  creator: true,
  canInvite: false,
  revision: 2,
}

function createPage() {
  if (!pageOptions) throw new Error('页面未注册')
  const instance = Object.create(null)
  Object.keys(pageOptions).forEach((key) => {
    instance[key] = pageOptions[key]
  })
  instance.data = JSON.parse(JSON.stringify(pageOptions.data))
  instance.setData = (patch, callback) => {
    Object.keys(patch).forEach((key) => {
      if (key.indexOf('.') === -1) {
        instance.data[key] = patch[key]
        return
      }
      const parts = key.split('.')
      let target = instance.data
      parts.slice(0, -1).forEach((part) => {
        if (!target[part] || typeof target[part] !== 'object') target[part] = {}
        target = target[part]
      })
      target[parts[parts.length - 1]] = patch[key]
    })
    if (callback) callback()
  }
  return instance
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const flushAll = async () => {
  for (let index = 0; index < 10; index += 1) await flush()
}

function stubSession(spaceStatusHandler) {
  storage.set('amour_token', 'token-a')
  handlers.set('/user/profile', (options) => options.success(ok({
    username: 'u', displayName: '测试用户', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', spaceStatusHandler)
}

async function loginWithSpace(space) {
  stubSession(options => options.success(ok(space)))
  await sessionState.ensureSessionReady()
  return sessionState.getSnapshot()
}

async function openPage(query) {
  const page = createPage()
  page.onLoad(query || {})
  await flushAll()
  assert.equal(page.data.loading, false, '首次状态确认应当结束')
  return page
}

const navigatedToSpaceHome = () => navigations.some(item => item.url === '/pages/index/index')
const updateRequests = () => requests.filter(item => item.path === '/space/update')
const statusRequests = () => requests.filter(item => item.path === '/space/status')

test.beforeEach(() => {
  storage.clear()
  requests.length = 0
  handlers.clear()
  toasts.length = 0
  navigations.length = 0
  modalResults.length = 0
  modalCalls = []
  currentPages = [{ route: 'pages/profile/profile', options: {} }, { route: 'pages/space-setup/index', options: {} }]
  sessionState.resetForTests()
  installWx()
})

// ============================ 回填 ============================

test('设置页回填空间信息：名称 / 简介 / 恋爱开始时间（含格式化展示）', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })

  assert.equal(page.data.settingsView, 'waiting')
  assert.deepEqual(page.data.spaceInfo, {
    spaceName: '我们的故事',
    description: '从这里开始',
    loveStartTime: '2024-05-20 19:30:47',
    loveStartTimeText: '2024-05-20 19:30',
  })
  assert.equal(page.data.spaceInfoEditable, true)
  assert.equal(page.data.canEditSpaceInfo, true)
  assert.equal(page.data.editingSpaceInfo, false)
  // 草稿初始值来自服务端基线（picker 拆成日期 + 时间）
  assert.deepEqual(page.data.spaceInfoForm, {
    spaceName: '我们的故事',
    description: '从这里开始',
    loveDate: '2024-05-20',
    loveTime: '19:30',
  })
  assert.equal(page.data.spaceInfoNameCount, 5)
  assert.equal(page.data.spaceInfoDescriptionCount, 5)
})

test('简介为空时回填空串（只读摘要显示占位），恋爱开始时间未设置', async () => {
  await loginWithSpace({
    ...WAITING_SPACE,
    description: null,
    loveStartTime: null,
  })
  const page = await openPage({ mode: 'settings' })

  assert.equal(page.data.spaceInfo.description, '')
  assert.equal(page.data.spaceInfo.loveStartTimeText, '')
  assert.equal(page.data.spaceInfoForm.description, '')
  assert.equal(page.data.spaceInfoForm.loveDate, '')
  assert.equal(page.data.spaceInfoForm.loveTime, '')
})

// ============================ 进入编辑 / picker 事件 ============================

test('进入编辑态：展示表单，原生日期 / 时间 picker 与清空按钮真实生效', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })

  page.onEditSpaceInfo()
  assert.equal(page.data.editingSpaceInfo, true)

  page.onLoveDateChange({ detail: { value: '2024-06-01' } })
  page.onLoveTimeChange({ detail: { value: '08:05' } })
  assert.equal(page.data.spaceInfoForm.loveDate, '2024-06-01')
  assert.equal(page.data.spaceInfoForm.loveTime, '08:05')

  page.onClearLoveStartTime()
  assert.equal(page.data.spaceInfoForm.loveDate, '')
  assert.equal(page.data.spaceInfoForm.loveTime, '')
})

test('名称 / 简介输入：实时更新字数提示，input 层按上限截断', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()

  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })
  page.onSpaceInfoDescriptionInput({ detail: { value: '新的简介' } })
  assert.equal(page.data.spaceInfoForm.spaceName, '新名字')
  assert.equal(page.data.spaceInfoForm.description, '新的简介')
  assert.equal(page.data.spaceInfoNameCount, 3)
  assert.equal(page.data.spaceInfoDescriptionCount, 4)

  // 超出上限时截断到 30 / 500（防御）
  page.onSpaceInfoNameInput({ detail: { value: '名'.repeat(40) } })
  page.onSpaceInfoDescriptionInput({ detail: { value: '简'.repeat(600) } })
  assert.equal(page.data.spaceInfoForm.spaceName.length, 30)
  assert.equal(page.data.spaceInfoForm.description.length, 500)
  assert.equal(page.data.spaceInfoNameCount, 30)
  assert.equal(page.data.spaceInfoDescriptionCount, 500)
})

// ============================ 保存：请求体 ============================

test('只改名称 / 简介保存：三字段显式提交，且保留原始秒数 19:30:47', async () => {
  await loginWithSpace(WAITING_SPACE)
  let updated = null
  handlers.set('/space/update', (options) => {
    updated = { ...WAITING_SPACE, spaceName: '新名字', description: '新简介', revision: 2 }
    options.success(ok(updated))
  })
  handlers.set('/space/status', options => options.success(ok(updated)))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '  新名字  ' } })
  page.onSpaceInfoDescriptionInput({ detail: { value: '新简介' } })
  await page.onSaveSpaceInfo()
  await flushAll()

  const updates = updateRequests()
  assert.equal(updates.length, 1)
  assert.deepEqual(Object.keys(updates[0].data).sort(), ['description', 'loveStartTime', 'spaceName'])
  assert.equal(updates[0].data.spaceName, '新名字', '名称应 trim')
  assert.equal(updates[0].data.description, '新简介')
  // 关键：只改名称 / 简介时不得把秒抹成 00
  assert.equal(updates[0].data.loveStartTime, '2024-05-20 19:30:47')
})

test('修改了日期 / 时间后保存：秒数按 00 处理', async () => {
  await loginWithSpace(WAITING_SPACE)
  let updated = null
  handlers.set('/space/update', (options) => {
    updated = { ...WAITING_SPACE, loveStartTime: '2024-06-01 08:05:00', revision: 2 }
    options.success(ok(updated))
  })
  handlers.set('/space/status', options => options.success(ok(updated)))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onLoveDateChange({ detail: { value: '2024-06-01' } })
  page.onLoveTimeChange({ detail: { value: '08:05' } })
  await page.onSaveSpaceInfo()
  await flushAll()

  assert.equal(updateRequests().length, 1)
  assert.equal(updateRequests()[0].data.loveStartTime, '2024-06-01 08:05:00')
})

test('清空恋爱开始时间：提交 null（不是空字符串）', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/update', options => options.success(ok({
    ...WAITING_SPACE, loveStartTime: null, revision: 2,
  })))
  handlers.set('/space/status', options => options.success(ok({
    ...WAITING_SPACE, loveStartTime: null, revision: 2,
  })))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onClearLoveStartTime()
  await page.onSaveSpaceInfo()
  await flushAll()

  const updates = updateRequests()
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.loveStartTime, null)
  assert.notEqual(updates[0].data.loveStartTime, '')
  assert.equal('loveStartTime' in updates[0].data, true, '清空时也必须显式提交 loveStartTime')
})

test('清空名称 / 简介：提交空字符串（后端落回默认名 / 清空简介）', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/update', options => options.success(ok({
    ...WAITING_SPACE, spaceName: '我们的故事', description: '', revision: 2,
  })))
  handlers.set('/space/status', options => options.success(ok({
    ...WAITING_SPACE, spaceName: '我们的故事', description: '', revision: 2,
  })))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '   ' } })
  page.onSpaceInfoDescriptionInput({ detail: { value: '' } })
  await page.onSaveSpaceInfo()
  await flushAll()

  const updates = updateRequests()
  assert.equal(updates.length, 1)
  assert.equal(updates[0].data.spaceName, '')
  assert.equal(updates[0].data.description, '')
})

// ============================ 保存：成功路径 ============================

test('保存成功：/space/update 1 次 + /space/status 刷新，展示更新且留在设置页', async () => {
  await loginWithSpace(WAITING_SPACE)
  const updatedSpace = {
    ...WAITING_SPACE,
    spaceName: '新名字',
    description: '新简介',
    loveStartTime: '2024-05-20 19:30:47',
    revision: 2,
  }
  handlers.set('/space/update', options => options.success(ok(updatedSpace)))
  handlers.set('/space/status', options => options.success(ok(updatedSpace)))

  const page = await openPage({ mode: 'settings' })
  const statusBefore = statusRequests().length
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })
  page.onSpaceInfoDescriptionInput({ detail: { value: '新简介' } })
  await page.onSaveSpaceInfo()
  await flushAll()

  assert.equal(updateRequests().length, 1, '/space/update 只应请求一次')
  assert.ok(statusRequests().length > statusBefore, '保存成功后必须刷新 /space/status')
  // 展示已更新
  assert.equal(page.data.spaceInfo.spaceName, '新名字')
  assert.equal(page.data.spaceInfo.description, '新简介')
  assert.equal(page.data.spaceName, '新名字')
  // 成功提示
  assert.ok(toasts.some(title => String(title).indexOf('空间信息已更新') !== -1), JSON.stringify(toasts))
  // 没有保存失败 / 同步失败提示
  assert.equal(page.data.spaceInfoError, '')
  assert.equal(page.data.spaceInfoSyncError, '')
  // 留在设置页，不 reLaunch 到情侣空间首页
  assert.equal(navigatedToSpaceHome(), false, `设置模式不应跳走：${JSON.stringify(navigations)}`)
  assert.equal(page.data.settingsView, 'waiting')
  // 推荐保留编辑态但基线已更新：再点保存不应重复提交
  assert.equal(page.data.editingSpaceInfo, true)
  await page.onSaveSpaceInfo()
  await flushAll()
  assert.equal(updateRequests().length, 1, '未修改时不得再次提交')
})

// ============================ 未修改 / 重复提交 / 校验 ============================

test('没有修改时不发请求：直接退出编辑态', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })

  page.onEditSpaceInfo()
  await page.onSaveSpaceInfo()
  await flushAll()

  assert.equal(updateRequests().length, 0, '未修改时不得请求 /space/update')
  assert.equal(page.data.editingSpaceInfo, false)
})

test('重复点击保存：只发一次 /space/update', async () => {
  await loginWithSpace(WAITING_SPACE)
  let releaseUpdate = null
  handlers.set('/space/update', (options) => {
    releaseUpdate = () => options.success(ok({ ...WAITING_SPACE, spaceName: '新名字', revision: 2 }))
  })
  handlers.set('/space/status', options => options.success(ok({ ...WAITING_SPACE, spaceName: '新名字', revision: 2 })))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })

  const first = page.onSaveSpaceInfo()
  const second = page.onSaveSpaceInfo()
  await flushAll()
  assert.equal(page.data.savingSpaceInfo, true, '请求在途时应处于保存中状态')
  assert.equal(updateRequests().length, 1, '重复点击只能发一次请求')

  releaseUpdate()
  await Promise.all([first, second])
  await flushAll()
  assert.equal(page.data.savingSpaceInfo, false)
  assert.equal(updateRequests().length, 1)
})

test('名称超过 30 字 / 简介超过 500 字：明确错误且不提交', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()

  // 绕过 input 的 maxlength 直接写超长值，验证保存前的防御校验
  page.setData({ 'spaceInfoForm.spaceName': '名'.repeat(31) })
  await page.onSaveSpaceInfo()
  await flushAll()
  assert.match(page.data.spaceInfoError, /空间名称不能超过 30/)
  assert.equal(updateRequests().length, 0)
  assert.equal(page.data.editingSpaceInfo, true, '校验失败应留在编辑态')

  page.setData({ 'spaceInfoForm.spaceName': '正常名字', 'spaceInfoForm.description': '简'.repeat(501) })
  await page.onSaveSpaceInfo()
  await flushAll()
  assert.match(page.data.spaceInfoError, /空间简介不能超过 500/)
  assert.equal(updateRequests().length, 0)
})

test('恰好 30 字名称 / 500 字简介可以通过校验并提交', async () => {
  await loginWithSpace(WAITING_SPACE)
  const name = '名'.repeat(30)
  const description = '简'.repeat(500)
  handlers.set('/space/update', options => options.success(ok({
    ...WAITING_SPACE, spaceName: name, description, revision: 2,
  })))
  handlers.set('/space/status', options => options.success(ok({
    ...WAITING_SPACE, spaceName: name, description, revision: 2,
  })))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: name } })
  page.onSpaceInfoDescriptionInput({ detail: { value: description } })
  await page.onSaveSpaceInfo()
  await flushAll()

  assert.equal(page.data.spaceInfoError, '')
  assert.equal(updateRequests().length, 1)
  assert.equal(updateRequests()[0].data.spaceName, name)
  assert.equal(updateRequests()[0].data.description, description)
})

// ============================ 取消 ============================

test('取消（无草稿）：恢复服务端数据、不发请求、不弹确认框', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })

  page.onEditSpaceInfo()
  modalCalls = []
  page.onCancelSpaceInfo()
  await flushAll()

  assert.equal(modalCalls.length, 0, '没有草稿时不应弹确认框')
  assert.equal(page.data.editingSpaceInfo, false)
  assert.equal(page.data.spaceInfoForm.spaceName, '我们的故事')
  assert.equal(updateRequests().length, 0)
})

test('取消（有草稿）：二次确认；选择继续编辑则保留草稿，确认放弃则恢复服务端数据', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })

  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '草稿名字' } })

  // 第一次：选择「继续编辑」
  modalResults.push({ confirm: false, cancel: true })
  page.onCancelSpaceInfo()
  await flushAll()
  assert.equal(modalCalls.length, 1)
  assert.match(String(modalCalls[0].title), /放弃未保存的修改/)
  assert.equal(page.data.editingSpaceInfo, true, '取消确认应留在编辑态')
  assert.equal(page.data.spaceInfoForm.spaceName, '草稿名字', '草稿必须保留')

  // 第二次：确认放弃
  modalResults.push({ confirm: true })
  page.onCancelSpaceInfo()
  await flushAll()
  assert.equal(page.data.editingSpaceInfo, false)
  assert.equal(page.data.spaceInfoForm.spaceName, '我们的故事', '应恢复服务端数据')
  assert.equal(updateRequests().length, 0, '取消绝不能发请求')
})

// ============================ 保存失败 ============================

test('保存失败（500）：保留用户输入、展示错误、可重试，不跳转', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/update', options => options.success(fail500()))

  const page = await openPage({ mode: 'settings' })
  navigations.length = 0
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })
  page.onSpaceInfoDescriptionInput({ detail: { value: '新简介' } })
  await page.onSaveSpaceInfo()
  await flushAll()

  assert.equal(updateRequests().length, 1)
  assert.equal(page.data.savingSpaceInfo, false, '失败后必须释放保存中状态')
  assert.match(page.data.spaceInfoError, /服务异常/)
  // 保留用户输入
  assert.equal(page.data.spaceInfoForm.spaceName, '新名字')
  assert.equal(page.data.spaceInfoForm.description, '新简介')
  assert.equal(page.data.editingSpaceInfo, true)
  // 不得误报成功或同步失败
  assert.equal(page.data.spaceInfoSyncError, '')
  assert.equal(toasts.some(title => String(title).indexOf('空间信息已更新') !== -1), false)
  assert.equal(navigations.length, 0, '失败不得跳转')
})

// ============================ 保存成功但状态同步失败 ============================

test('保存成功但 /space/status 失败：提示同步失败，可只重试同步且不重发更新', async () => {
  await loginWithSpace(WAITING_SPACE)
  const updatedSpace = { ...WAITING_SPACE, spaceName: '新名字', revision: 2 }
  handlers.set('/space/update', options => options.success(ok(updatedSpace)))
  // 保存后的状态刷新失败
  handlers.set('/space/status', options => options.success(fail500()))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })
  await page.onSaveSpaceInfo()
  await flushAll()

  assert.equal(updateRequests().length, 1)
  // 不是「保存失败」：不出现保存错误文案，保存中状态已释放
  assert.equal(page.data.spaceInfoError, '')
  assert.equal(page.data.savingSpaceInfo, false)
  // 独立提示「已保存，但状态同步失败」
  assert.match(page.data.spaceInfoSyncError, /已保存.*状态同步失败/)
  // 展示仍以接口返回为准
  assert.equal(page.data.spaceInfo.spaceName, '新名字')
  // 草稿不清空
  assert.equal(page.data.spaceInfoForm.spaceName, '新名字')
  assert.equal(page.data.editingSpaceInfo, true)

  // 重试同步：只调 /space/status，不重新提交更新
  handlers.set('/space/status', options => options.success(ok(updatedSpace)))
  const statusBefore = statusRequests().length
  await page.retrySpaceInfoSync()
  await flushAll()

  assert.ok(statusRequests().length > statusBefore, '重试同步必须重新拉取状态')
  assert.equal(updateRequests().length, 1, '重试同步绝不能重新提交 /space/update')
  assert.equal(page.data.spaceInfoSyncError, '')
  assert.ok(toasts.some(title => String(title).indexOf('状态已同步') !== -1), JSON.stringify(toasts))
})

// ============================ 另一半并发加入 ============================

test('编辑期间另一半加入（20064）：提示原因 + 强制刷新 + 转只读', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/update', options => options.success(
    bizError('20064', '只有等待另一半加入时才能编辑空间信息'),
  ))
  // 刷新后服务端告知另一半已加入
  handlers.set('/space/status', options => options.success(ok(NORMAL_SPACE)))

  const page = await openPage({ mode: 'settings' })
  const statusBefore = statusRequests().length
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })
  await page.onSaveSpaceInfo()
  await flushAll()

  assert.equal(updateRequests().length, 1)
  assert.match(page.data.spaceInfoError, /另一半已经加入/)
  assert.ok(statusRequests().length > statusBefore, '20064 必须强制刷新状态')
  // 转为只读：退出编辑态、可编辑性关闭、面板切到 ready
  assert.equal(page.data.editingSpaceInfo, false)
  assert.equal(page.data.spaceInfoEditable, false)
  assert.equal(page.data.canEditSpaceInfo, false)
  assert.equal(page.data.settingsView, 'ready')
  assert.equal(page.data.memberCount, 2)
  // 保留服务端数据（关系以刷新结果为准）
  assert.equal(page.data.space.status, SPACE_STATUS.NORMAL)
  assert.equal(navigatedToSpaceHome(), false)
})

// ============================ 与销毁互斥 ============================

test('与销毁互斥：销毁进行中不可保存；保存进行中不可销毁', async () => {
  await loginWithSpace(WAITING_SPACE)
  let releaseUpdate = null
  handlers.set('/space/update', (options) => {
    releaseUpdate = () => options.success(ok({ ...WAITING_SPACE, spaceName: '新名字', revision: 2 }))
  })
  handlers.set('/space/status', options => options.success(ok({ ...WAITING_SPACE, spaceName: '新名字', revision: 2 })))

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })

  // 销毁进行中 → 不可保存
  page.setData({ destroying: true })
  await page.onSaveSpaceInfo()
  await flushAll()
  assert.equal(updateRequests().length, 0, '销毁进行中不得保存空间信息')
  page.setData({ destroying: false })

  // 保存进行中 → 不可销毁（不打开确认框）
  modalCalls = []
  const saving = page.onSaveSpaceInfo()
  await flushAll()
  page.onDestroySpace()
  await flushAll()
  assert.equal(modalCalls.length, 0, '保存进行中不得打开销毁确认框')

  releaseUpdate()
  await saving
  await flushAll()
})

// ============================ 页面卸载 ============================

test('页面卸载（onUnload）后异步返回：不再 setData、不弹 toast', async () => {
  await loginWithSpace(WAITING_SPACE)
  let releaseUpdate = null
  handlers.set('/space/update', (options) => {
    releaseUpdate = () => options.success(ok({ ...WAITING_SPACE, spaceName: '新名字', revision: 2 }))
  })

  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '新名字' } })
  const saving = page.onSaveSpaceInfo()
  await flushAll()
  assert.equal(updateRequests().length, 1)

  const toastsBefore = toasts.length
  let setDataCountAfterUnload = 0
  const originalSetData = page.setData
  page.setData = (patch, callback) => {
    setDataCountAfterUnload += 1
    return originalSetData(patch, callback)
  }
  page.onUnload()
  assert.equal(page.pageDisposed, true)

  releaseUpdate()
  await saving
  await flushAll()

  assert.equal(setDataCountAfterUnload, 0, '页面卸载后不得再 setData')
  assert.equal(toasts.length, toastsBefore, '页面卸载后不得再弹 toast')
})

// ============================ 后台刷新不覆盖草稿 ============================

test('同一空间的后台刷新不覆盖编辑中的草稿，只更新基线来源数据', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })

  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '草稿名字' } })
  page.onSpaceInfoDescriptionInput({ detail: { value: '草稿简介' } })

  // 模拟后台刷新（onShow / 订阅回调）：服务端数据已变化
  const refreshedSpace = { ...WAITING_SPACE, spaceName: '服务端改名', description: '服务端简介' }
  handlers.set('/space/status', options => options.success(ok(refreshedSpace)))
  page.applySnapshot({
    status: SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
    space: refreshedSpace,
    authError: '',
    spaceError: '',
  }, { silent: true })
  await flushAll()

  // 草稿不被覆盖
  assert.equal(page.data.spaceInfoForm.spaceName, '草稿名字')
  assert.equal(page.data.spaceInfoForm.description, '草稿简介')
  assert.equal(page.data.editingSpaceInfo, true)
  // 只读摘要使用服务端最新数据（基线来源数据已更新）
  assert.equal(page.data.spaceInfo.spaceName, '服务端改名')
  assert.equal(page.data.spaceInfo.description, '服务端简介')

  // 基线已换成服务端最新值：此时取消应恢复到「服务端改名」
  modalResults.push({ confirm: true })
  page.onCancelSpaceInfo()
  await flushAll()
  assert.equal(page.data.spaceInfoForm.spaceName, '服务端改名')
})

test('spaceId 变化时用新空间数据回填并退出编辑态', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '草稿名字' } })

  const otherSpace = {
    ...WAITING_SPACE,
    spaceId: 999,
    spaceName: '另一个空间',
    description: '',
    loveStartTime: null,
  }
  page.applySnapshot({
    status: SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
    space: otherSpace,
    authError: '',
    spaceError: '',
  }, { silent: true })
  await flushAll()

  assert.equal(page.data.editingSpaceInfo, false, '换空间必须退出编辑态')
  assert.equal(page.data.spaceInfoForm.spaceName, '另一个空间')
  assert.equal(page.data.spaceInfoForm.loveDate, '')
  assert.equal(page.data.spaceInfo.spaceName, '另一个空间')
})

// ============================ 另一半已加入：只读 ============================

test('另一半已加入（ready）：只读摘要 + 说明，不出现编辑入口', async () => {
  await loginWithSpace(NORMAL_SPACE)
  const page = await openPage({ mode: 'settings' })

  assert.equal(page.data.settingsView, 'ready')
  assert.equal(page.data.spaceInfoEditable, false)
  assert.equal(page.data.canEditSpaceInfo, false)
  assert.equal(page.data.editingSpaceInfo, false)
  assert.equal(page.data.spaceInfo.spaceName, '我们的故事')
  assert.equal(page.data.spaceInfo.loveStartTimeText, '2024-05-20 19:30')
  // 即使直接调用入口也不会进入编辑态
  page.onEditSpaceInfo()
  assert.equal(page.data.editingSpaceInfo, false)
})

// ============================ 返回时的未保存确认 ============================

test('导航栏返回：有未保存草稿时确认一次，确认后正常返回且不阻碍导航', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })
  page.onEditSpaceInfo()
  page.onSpaceInfoNameInput({ detail: { value: '草稿名字' } })
  navigations.length = 0
  modalCalls = []

  // 第一次选择「继续编辑」
  modalResults.push({ confirm: false })
  page.onNavBack()
  await flushAll()
  assert.equal(modalCalls.length, 1)
  assert.match(String(modalCalls[0].title), /放弃未保存的修改/)
  assert.equal(navigations.length, 0)

  // 第二次确认放弃 → 正常返回（栈内 navigateBack）
  modalResults.push({ confirm: true })
  page.onNavBack()
  await flushAll()
  assert.equal(navigations.length, 1)
  assert.equal(navigations[0].type, 'navigateBack')
})

test('导航栏返回：没有草稿时行为保持不变（栈内不额外跳转）', async () => {
  await loginWithSpace(WAITING_SPACE)
  const page = await openPage({ mode: 'settings' })
  navigations.length = 0
  modalCalls = []

  page.onNavBack()
  await flushAll()

  assert.equal(modalCalls.length, 0)
  assert.equal(navigations.length, 0)
})
