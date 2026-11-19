/**
 * 情侣空间创建 / 绑定页。
 *
 * 承载两个入口（与「我的」页面的引导区一一对应）：
 * 1. 创建情侣空间：POST /space/create，成功后强制刷新全局状态；
 * 2. 绑定 / 加入：支持「我收到的邀请」一键接受，也支持粘贴邀请链接 / 令牌接受。
 *
 * 页面约定：
 * - 只负责表单与交互，状态判断和刷新都交给 utils/session-state；
 * - 访问级别为 AUTH（只需登录），未登录时由页面守卫跳登录页；
 * - 成功后不自行改写全局状态，必须重新拉取 /space/status（后端为准）；
 * - 失败保留当前输入与页面状态，展示明确错误和重试入口。
 */
const { guardPageReady, navigateWithGuard, openSpaceSetup } = require('../../utils/access-control')
const { withPageViewTracking } = require('../../utils/page-view-lifecycle')
const {
  createCoupleSpace,
  createSpaceInvitation,
  destroyCoupleSpace,
  updateCoupleSpace,
  fetchReceivedInvitations,
  previewInvitation,
  acceptInvitation,
} = require('../../utils/space-api')
const {
  ensureSessionReady,
  getSnapshot,
  refreshAfterSpaceChange,
  refreshSession,
} = require('../../utils/session-state')
const {
  SESSION_STATUS,
  SPACE_HOME_ROUTE,
  PROFILE_ROUTE,
  PLAZA_ROUTE,
} = require('../../utils/session-constants')
const {
  canDestroySpace,
  canShowDestroyEntry,
  deriveHasSpace,
  destroyBlockReason,
  isDestroyRejectedByServer,
  isWaitingForPartner,
} = require('../../utils/session-rules')
const {
  DESTROY_CONFIRM_KEYWORD,
  buildDestroyErrorMessage,
  buildDestroyPromptMessage,
  clearSpaceLocalCache,
  validateDestroyConfirmInput,
} = require('../../utils/space-destroy')
const {
  SPACE_SETUP_MODE,
  parseSpaceSetupQuery,
} = require('../../utils/space-setup-route')
const {
  SPACE_INFO_DESCRIPTION_MAX,
  SPACE_INFO_NAME_MAX,
  SPACE_INFO_SYNC_ERROR_MESSAGE,
  buildSpaceInfoBaseline,
  buildSpaceInfoDraft,
  buildSpaceInfoErrorMessage,
  buildSpaceInfoUpdatePayload,
  buildSpaceInfoValidationError,
  canEditSpaceInfo,
  describeSpaceInfo,
  isSpaceInfoDirty,
  isSpaceInfoUpdateConflict,
  measureText,
  todayLocalDate,
} = require('../../utils/space-edit')

const SPACE_NAME_MAX = 30
const DESCRIPTION_MAX = 500
const INVITATION_ID_PATTERN = /^\d{1,18}$/

/** 创建 / 绑定已成功、只是全局状态刷新失败时的提示标题与兜底文案。 */
const CREATE_SYNC_ERROR_TITLE = '情侣空间已创建，但状态刷新失败'
const BIND_SYNC_ERROR_TITLE = '已加入情侣空间，但状态刷新失败'
const SYNC_ERROR_MESSAGE = '状态刷新失败，请检查网络后重试'

/** 空间状态文案（后端 statusText 缺失时的本地兜底）。 */
const SPACE_STATUS_TEXT = {
  0: '等待绑定',
  1: '正常',
  2: '已冻结',
  3: '历史归档',
  4: '删除等待期',
  5: '已解绑',
  6: '已销毁',
}

/**
 * 设置模式下当前应渲染的面板。
 *
 * WXML 只认这一个字段，页面脚本只在这一处决定分支，
 * 避免「hasSpace / waiting / pageError / notLoggedIn」四个布尔在模板里组合出空白面板。
 *
 * - 'guest'：未登录（守卫通常已跳登录页，这里是兜底提示）
 * - 'error'：状态加载失败，展示 pageError + 重试
 * - 'waiting'：已有空间且等待另一半加入，展示邀请管理 + 销毁入口
 * - 'ready'：已有空间且另一半已加入，展示成员摘要 + 不能销毁的原因
 * - 'empty'：已登录但没有空间，展示创建 / 绑定引导
 * - ''：非设置模式（沿用原来的创建 / 绑定流程）
 */
const SETTINGS_VIEW = Object.freeze({
  NONE: '',
  GUEST: 'guest',
  ERROR: 'error',
  WAITING: 'waiting',
  READY: 'ready',
  EMPTY: 'empty',
})

/** 计算设置模式面板；非设置模式一律返回 ''。 */
function resolveSettingsView(state) {
  const source = state || {}
  if (!source.isSettings) return SETTINGS_VIEW.NONE
  if (source.notLoggedIn) return SETTINGS_VIEW.GUEST
  if (source.pageError) return SETTINGS_VIEW.ERROR
  if (!source.hasSpace) return SETTINGS_VIEW.EMPTY
  return source.waiting ? SETTINGS_VIEW.WAITING : SETTINGS_VIEW.READY
}

function getErrorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.trim()) return error.message.trim()
  return fallback
}

/** 安全取数字：非数字一律按 0 处理，避免 NaN 渲染到 WXML。 */
function numberOrZero(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** 读取当前页面栈深度；运行环境缺少 getCurrentPages 时按 1 处理（视为栈底）。 */
function readPageDepth() {
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    return Array.isArray(pages) && pages.length ? pages.length : 1
  } catch (error) {
    return 1
  }
}

/**
 * 是否允许在设置页生成邀请。
 *
 * 与后端 createInvitation 的校验一致：只有「等待绑定 + 有效成员不足 2 人 + 当前用户是创建者」
 * 才能生成；后端还会再校验一次，前端只用它决定按钮是否可点。
 *
 * @param {object|null} space
 * @returns {boolean}
 */
function deriveCanInviteNow(space) {
  if (!isWaitingForPartner(space)) return false
  if (space.canInvite === false) return false
  if (space.creator === false) return false
  const count = Number(space.memberCount)
  return !Number.isFinite(count) || count < 2
}

/** 空间状态文案：优先用后端下发的 statusText。 */
function describeSpaceStatus(space) {
  if (!space || typeof space !== 'object') return ''
  const text = typeof space.statusText === 'string' ? space.statusText.trim() : ''
  if (text) return text
  const code = Number(space.status)
  return Number.isFinite(code) ? (SPACE_STATUS_TEXT[code] || '') : ''
}

/** 成员 / 状态摘要（设置页展示，不参与任何鉴权判断）。 */
function describeSpaceSummary(space, hasSpace, waiting, memberCount) {
  if (!hasSpace) return ''
  if (waiting) return '等待另一半加入'
  const statusText = describeSpaceStatus(space)
  const memberText = memberCount > 0 ? `${memberCount} 位成员` : '空间已就绪'
  return statusText ? `${memberText} · ${statusText}` : memberText
}

/**
 * 页面标题与 hero 文案。
 *
 * 设置模式与创建 / 绑定模式的文案必须区分开，避免用户以为自己进错了页面；
 * 设置模式还要按「未登录 / 加载失败 / 无空间 / 等待绑定 / 已就绪」给出不同说明。
 *
 * @param {{ isSettings: boolean, hasSpace: boolean, waiting: boolean, pageError: string, notLoggedIn: boolean }} state
 */
function describePageChrome(state) {
  const source = state || {}
  if (source.isSettings) {
    if (source.notLoggedIn) {
      return {
        pageTitle: '空间设置',
        heroKicker: 'SPACE SETTINGS',
        heroTitle: '登录后管理空间',
        heroCopy: '登录后即可查看并管理你的情侣空间。',
      }
    }
    if (source.pageError) {
      return {
        pageTitle: '空间设置',
        heroKicker: 'SPACE SETTINGS',
        heroTitle: '状态暂时无法确认',
        heroCopy: '请先重试确认真实状态，再决定要做的操作。',
      }
    }
    if (!source.hasSpace) {
      return {
        pageTitle: '空间设置',
        heroKicker: 'SPACE SETTINGS',
        heroTitle: '还没有可用空间',
        heroCopy: '创建或绑定一个情侣空间后，就可以在这里管理它。',
      }
    }
    if (source.waiting) {
      return {
        pageTitle: '空间设置',
        heroKicker: 'SPACE SETTINGS',
        heroTitle: '等待另一半加入',
        heroCopy: '在这里管理邀请；在另一半加入之前，也可以销毁并清空空间。',
      }
    }
    return {
      pageTitle: '空间设置',
      heroKicker: 'SPACE SETTINGS',
      heroTitle: '空间已就绪',
      heroCopy: '你们已经是这个空间的成员，下面可以查看当前成员与空间状态。',
    }
  }
  return {
    pageTitle: '情侣空间',
    heroKicker: 'OUR SPACE',
    heroTitle: source.waiting ? '等待另一半加入' : '开启你们的情侣空间',
    heroCopy: source.waiting
      ? '把邀请令牌发给 Ta，Ta 在「我的 → 绑定情侣空间」输入后即可加入。'
      : '创建属于两个人的空间，把故事、照片和悄悄话都收在这里。',
  }
}

/** 邀请输入归一化：既接受完整链接，也接受裸令牌。 */
function extractInvitationToken(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const fromQuery = text.match(/[?&]token=([^&#\s]+)/)
  if (fromQuery && fromQuery[1]) {
    try {
      return decodeURIComponent(fromQuery[1])
    } catch (error) {
      return fromQuery[1]
    }
  }
  // 形如 /invitation/<token> 的路径。
  const fromPath = text.match(/\/invitation\/([^/?#\s]+)\/?$/)
  if (fromPath && fromPath[1]) return fromPath[1]
  if (/^https?:\/\//i.test(text)) return ''
  return text
}

/** 表单时间转后端 LocalDateTime：yyyy-MM-dd HH:mm:ss。 */
function toBackendDateTime(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const normalized = text.replace('T', ' ')
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized) ? `${normalized}:00` : normalized
}

Page(withPageViewTracking({
  data: {
    /* —— 视图模式（由 onLoad query 决定，页面生命周期内不变） —— */
    /** 设置模式：已有空间的用户在本页管理邀请 / 销毁，不会被自动跳走 */
    isSettingsMode: false,
    /** 解析后的视图模式：'' | 'create' | 'bind' | 'settings' */
    viewMode: '',
    /** 设置模式当前应渲染的面板：'' | 'guest' | 'error' | 'waiting' | 'ready' | 'empty' */
    settingsView: '',

    /* —— 页面文案（设置模式与创建 / 绑定模式区分） —— */
    pageTitle: '情侣空间',
    heroKicker: 'OUR SPACE',
    heroTitle: '开启你们的情侣空间',
    heroCopy: '创建属于两个人的空间，把故事、照片和悄悄话都收在这里。',

    /** 当前空间状态（来自全局状态）；有空间时本页只做提示，不再展示创建入口 */
    hasSpace: false,
    space: null,
    spaceName: '',
    /** waiting：已完成创建，等待另一半加入 */
    waiting: false,
    /** 设置模式摘要：成员数 / 状态文案 / 一句话摘要 */
    memberCount: 0,
    spaceStatusText: '',
    spaceSummary: '',
    /** 是否现在可以生成邀请（等待绑定 + 成员不足 2 人 + 创建者） */
    canInviteNow: false,
    /** 设置模式下是否展示邀请管理（等待绑定且有权限时） */
    canManageInvitations: false,
    /** 未登录时设置页也给出可理解的说明，而不是空白 */
    notLoggedIn: false,
    loading: true,
    pageError: '',

    /* 创建表单 */
    form: { spaceName: '', description: '', loveStartTime: '' },
    createError: '',
    creating: false,
    /** 创建 / 绑定已成功但全局状态刷新失败：独立错误态 + 重试入口，不回滚已创建状态 */
    syncError: '',
    syncErrorTitle: '',
    syncing: false,

    /* 邀请 / 绑定 */
    invitationCode: '',
    bindError: '',
    bindInfo: '',
    binding: false,
    previewing: false,
    preview: null,
    receivedInvitations: [],
    receivedLoading: false,
    receivedError: '',
    createdInvitationLink: '',
    invitationLinkError: '',
    invitationLinkLoading: false,

    /* 创建者销毁 */
    showDestroyEntry: false,
    canDestroyNow: false,
    destroyBlockReason: '',
    destroying: false,
    destroyError: '',

    /* 空间基础信息（设置模式：等待另一半加入时可编辑，另一半加入后只读） */
    /** 只读摘要：空间名称 / 简介 / 恋爱开始时间（含格式化文本） */
    spaceInfo: { spaceName: '', description: '', loveStartTime: '', loveStartTimeText: '' },
    /** 当前是否允许编辑（等待绑定 + 有效成员不足 2 人） */
    spaceInfoEditable: false,
    /** 兼容别名：与 spaceInfoEditable 同值，便于模板 / 测试按语义取值 */
    canEditSpaceInfo: false,
    /** 是否处于编辑态（true 时展示表单而不是只读摘要） */
    editingSpaceInfo: false,
    /** 编辑草稿：picker 拆成日期 + 时间两个值，保存时由纯函数组装 */
    spaceInfoForm: { spaceName: '', description: '', loveDate: '', loveTime: '' },
    spaceInfoNameCount: 0,
    spaceInfoDescriptionCount: 0,
    /** 与后端 UpdateSpaceReqVO 一致的长度上限（同时用于 input / textarea maxlength） */
    spaceInfoNameMax: SPACE_INFO_NAME_MAX,
    spaceInfoDescriptionMax: SPACE_INFO_DESCRIPTION_MAX,
    /** 编辑 / 保存错误（保存失败时保留用户输入，只展示错误） */
    spaceInfoError: '',
    savingSpaceInfo: false,
    /** 保存成功但全局状态刷新失败：独立提示 + 只重试同步入口，不重发更新 */
    spaceInfoSyncError: '',
    syncingSpaceInfo: false,
  },

  onLoad(query) {
    this.pageDisposed = false
    /** 创建 / 绑定接口是否已经明确成功（成功后不再允许重复提交）。 */
    this.spaceChangeSucceeded = false
    /** 创建 / 绑定成功后接口返回的空间数据，用于同步失败时兜底本页展示。 */
    this.localSpace = null
    /** 当前同步失败提示对应的来源：create / bind（重试时决定文案）。 */
    this.pendingSyncKind = 'create'
    /**
     * 空间基础信息编辑基线：服务端最近一次确认的空间基础信息。
     * 草稿与它的比较决定「是否有未保存修改」，保存成功后由接口返回的 SpaceStatusVO 更新。
     */
    this.spaceInfoBaseline = buildSpaceInfoBaseline(null)
    /** 「放弃未保存修改」二次确认是否正在进行（避免重复弹窗叠加）。 */
    this.spaceInfoDiscardConfirming = false
    /** 返回时的未保存确认是否正在进行。 */
    this.spaceInfoLeaveConfirming = false
    // 入口参数解析统一交给纯函数：?mode=settings 优先于 ?action=create / bind。
    const parsed = parseSpaceSetupQuery(query)
    this.viewMode = parsed.mode
    this.isSettingsMode = parsed.isSettings
    this.initialAction = parsed.mode === SPACE_SETUP_MODE.BIND
      ? 'bind'
      : (parsed.mode === SPACE_SETUP_MODE.CREATE ? 'create' : '')
    this.setData({ viewMode: parsed.mode, isSettingsMode: parsed.isSettings })
    // 首帧就使用正确标题 / hero 文案：设置模式不能先闪一下「开启你们的情侣空间」。
    this.applyPageChrome()
    /** 真实页面栈深度：导航栏返回按钮在栈底（分享 / 扫码直达）时会失效，需要兜底。 */
    this.pageDepth = readPageDepth()
    this.bootstrap()
  },

  onShow() {
    // 从登录页 / 邀请确认回来时重新确认状态，避免继续按旧状态渲染。
    // silent：这里只同步数据，不在这里跳转；且 applySnapshot 会保护“刚创建成功”的本页状态。
    if (this.initialized) this.applySnapshot(getSnapshot(), { silent: true })
  },

  onUnload() {
    this.pageDisposed = true
    // 页面卸载后不能再有「未保存离开确认」，否则会残留在下一个页面上。
    this.disableLeaveGuard()
  },

  /**
   * 是否应该在「已有空间」时离开本页。
   *
   * 所有判定落点（bootstrap / applySnapshot 回调 / syncAfterSpaceChange / onRetrySync /
   * onRecheck / 销毁被拒后的重新同步）都必须收敛到这里：
   * - 设置模式一律留在本页，否则用户根本无法停留在「空间设置」；
   * - 非设置模式保持原有行为：等待另一半加入时留在本页展示邀请，其余回到情侣空间首页。
   *
   * @param {object|null} snapshot
   * @returns {boolean}
   */
  shouldLeaveAfterSuccess(snapshot) {
    if (this.isSettingsMode) return false
    if (snapshot && isWaitingForPartner(snapshot.space)) return false
    return true
  },

  /**
   * 页面守卫 + 首次状态确认。
   *
   * @param {{ force?: boolean }} [options] force=true 时强制重新拉取状态（错误态的重试入口）
   */
  async bootstrap(options) {
    const force = Boolean(options && options.force)
    this.setData({ loading: true, pageError: '' })
    const allowed = await guardPageReady('pages/space-setup/index', { silent: true })
    if (this.pageDisposed) return
    if (!allowed) {
      // 守卫已经发起跳转（未登录 → 登录页）。设置模式补一层兜底提示：
      // 万一跳转没有生效（例如栈底、跳转失败），用户至少能看到说明而不是空白页。
      if (this.isSettingsMode) {
        this.applySnapshot(getSnapshot(), { silent: true })
        this.setData({ loading: false })
      }
      return
    }
    // 重试必须绕过 ensureSessionReady 的“已确认”缓存，否则错误态永远无法恢复。
    const snapshot = force
      ? await refreshSession({ force: true, reason: 'space-setup:retry-page' }).catch(() => getSnapshot())
      : await ensureSessionReady().catch(() => getSnapshot())
    if (this.pageDisposed) return
    this.initialized = true
    // silent：bootstrap 自己决定落点，避免 applySnapshot 回调里重复跳转。
    this.applySnapshot(snapshot, { silent: true })
    this.setData({ loading: false })
    if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
      // 已有空间：不需要创建 / 绑定。设置模式留在本页管理空间，其余回到情侣空间首页。
      this.leaveAfterSuccess(snapshot)
      return
    }
    if (this.data.hasSpace) {
      // 创建 / 绑定已经成功，只是这次全局状态确认失败：留在本页展示同步错误与重试入口，
      // 绝不能回退成“未创建”让用户重复提交。
      this.showSyncError(this.pendingSyncKind, snapshot)
      return
    }
    if (this.initialAction === 'bind') this.loadReceivedInvitations()
  },

  applySnapshot(snapshot, options) {
    if (!snapshot) return
    if (this.pageDisposed) return
    const globalHasSpace = snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
    // 登录态失效（401 / 20002）：按项目既有语义交给 session-state 收敛为未登录。
    const notLoggedIn = snapshot.status === SESSION_STATUS.UNAUTHENTICATED
    // 创建 / 绑定接口已经明确成功时，同步失败或旧快照都不得把本页回滚成“未创建”：
    // 否则页面会重新展示创建表单，用户可以再次点击创建（后端会返回 20033）。
    const keepLocalSpace = Boolean(this.spaceChangeSucceeded)
      && !globalHasSpace
      && !notLoggedIn
    const space = globalHasSpace
      ? (snapshot.space || null)
      : (keepLocalSpace ? (this.localSpace || null) : null)
    const hasSpace = globalHasSpace || keepLocalSpace
    const waiting = isWaitingForPartner(space)
    const memberCount = hasSpace ? numberOrZero(space && space.memberCount) : 0
    const pageError = !keepLocalSpace && snapshot.status === SESSION_STATUS.ERROR
      ? (snapshot.authError || snapshot.spaceError || '情侣空间状态加载失败，请重试')
      : ''
    // 空间基础信息：回填摘要 / 可编辑性；编辑中且同空间时只更新基线，不覆盖草稿。
    // 状态暂时无法确认（ERROR 快照）时退回本页已展示的空间数据，
    // 避免一次后台刷新失败就把用户正在编辑的草稿清空（此时面板展示的是错误态，不会渲染该卡片）。
    const spaceInfoSource = hasSpace
      ? space
      : (this.data.editingSpaceInfo === true ? this.data.space : null)
    const spaceInfoState = this.buildSpaceInfoPatch(spaceInfoSource)
    this.spaceInfoBaseline = spaceInfoState.baseline
    this.setData(Object.assign({
      hasSpace,
      space,
      spaceName: hasSpace && space && typeof space.spaceName === 'string' ? space.spaceName : '',
      waiting,
      memberCount,
      spaceStatusText: hasSpace ? describeSpaceStatus(space) : '',
      spaceSummary: describeSpaceSummary(space, hasSpace, waiting, memberCount),
      canInviteNow: hasSpace && deriveCanInviteNow(space),
      canManageInvitations: this.isSettingsMode === true && hasSpace && deriveCanInviteNow(space),
      notLoggedIn,
      showDestroyEntry: hasSpace && canShowDestroyEntry(space),
      canDestroyNow: hasSpace && canDestroySpace(space),
      // 不能销毁的原因始终计算：设置模式在「另一半已加入」时也要展示明确原因，
      // 而不是只依赖入口是否出现（后端同样会按成员关系拒绝）。
      destroyBlockReason: hasSpace ? destroyBlockReason(space) : '',
      pageError,
      // 全局状态恢复后，同步错误提示随之清除。
      syncError: globalHasSpace ? '' : this.data.syncError,
      syncErrorTitle: globalHasSpace ? '' : this.data.syncErrorTitle,
    }, spaceInfoState.patch), () => {
      this.applyPageChrome()
      if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
        && this.initialized
        && !(options && options.silent)) {
        this.leaveAfterSuccess(snapshot)
      }
    })
  },

  /** 按当前数据刷新标题、hero 文案与设置模式面板（保持唯一渲染入口）。 */
  applyPageChrome() {
    const isSettings = this.isSettingsMode === true
    const state = {
      isSettings,
      hasSpace: this.data.hasSpace,
      waiting: this.data.waiting,
      pageError: this.data.pageError,
      notLoggedIn: this.data.notLoggedIn,
    }
    const chrome = describePageChrome(state)
    chrome.settingsView = resolveSettingsView(state)
    this.setData(chrome)
  },

  /**
   * 创建 / 绑定成功后的统一落点。
   *
   * 具体是否离开由 shouldLeaveAfterSuccess 决定：
   * - 设置模式：留在本页（设置页是用户主动进入的管理页，不能把用户弹走）；
   * - 等待绑定 / 非设置模式：停留在本页展示邀请；
   * - 其余：reLaunch 到情侣空间首页（失败兜底「我的」）。
   */
  leaveAfterSuccess(snapshot) {
    if (!this.shouldLeaveAfterSuccess(snapshot)) return
    wx.reLaunch({
      url: SPACE_HOME_ROUTE,
      fail: () => wx.reLaunch({ url: PROFILE_ROUTE }),
    })
  },

  /* ===================== 创建者销毁空间 ===================== */

  /**
   * 销毁并清空空间（仅创建者、另一半未加入时可用）。
   *
   * 交互约定：
   * 1. 先用 showModal 说明后果（双方不可见、用户侧不可恢复、仅管理员可协助恢复）；
   * 2. 二次确认要求逐字输入固定文案，降低误触；
   * 3. 提交期间禁用重复点击；
   * 4. 成功后必须先强制刷新全局状态，确认服务器不再返回该空间，才清理本地缓存并重建页面栈；
   * 5. 服务端拒绝（例如另一半已加入）时保留当前页面，提示可理解信息并强制刷新，
   *    不依赖入口隐藏来保证安全。
   */
  onDestroySpace() {
    if (this.data.destroying || !this.data.canDestroyNow) return
    // 与「保存空间信息」互斥：保存进行中不允许发起销毁（两边都是写操作，不能交叉）。
    if (this.data.savingSpaceInfo) {
      wx.showToast({ title: '空间信息正在保存，请稍后再试', icon: 'none' })
      return
    }
    // 确认链进行中再次点击必须直接忽略，否则会叠加打开多个确认框，
    // 用户可能在多个弹窗里都点确认而发出重复请求。
    if (this.destroyConfirming) return
    this.destroyConfirming = true
    const space = this.data.space
    const finish = () => { this.destroyConfirming = false }
    wx.showModal({
      title: '销毁并清空情侣空间',
      content: buildDestroyPromptMessage(space),
      confirmText: DESTROY_CONFIRM_KEYWORD,
      cancelText: '取消',
      confirmColor: '#b85060',
      success: (result) => {
        if (result.confirm) {
          // 交给第二步确认；该步骤自己负责在结束时释放确认链标记。
          this.confirmDestroySpaceWithInput(finish)
          return
        }
        finish()
      },
      fail: finish,
    })
  },

  /** 第二步确认：要求逐字输入「销毁」，避免误触。 */
  confirmDestroySpaceWithInput(done) {
    const finish = typeof done === 'function' ? done : () => { this.destroyConfirming = false }
    wx.showModal({
      title: `请输入“${DESTROY_CONFIRM_KEYWORD}”确认`,
      editable: true,
      placeholderText: `请输入${DESTROY_CONFIRM_KEYWORD}`,
      confirmText: '确认销毁',
      cancelText: '取消',
      confirmColor: '#b85060',
      success: (result) => {
        if (!result.confirm) {
          finish()
          return
        }
        const error = validateDestroyConfirmInput(result.content)
        if (error) {
          wx.showToast({ title: error, icon: 'none', duration: 2000 })
          finish()
          return
        }
        // 先释放确认链标记，再由 destroySpace 自己用 destroying 防重复提交。
        finish()
        this.destroySpace()
      },
      fail: finish,
    })
  },

  /** 提交销毁请求。只有刷新确认服务器已无该空间后，才清理本地状态并离开。 */
  async destroySpace() {
    if (this.data.destroying) return
    // 与空间信息保存互斥：保存进行中不允许销毁。
    if (this.data.savingSpaceInfo) {
      wx.showToast({ title: '空间信息正在保存，请稍后再试', icon: 'none' })
      return
    }
    this.setData({ destroying: true, destroyError: '' })
    // 带上「刚才看到的那个空间」的绑定信息：服务端会校验一致性（不一致返回 20103），
    // 绝不会把用户后来新建的空间当成这个空间销毁；取不到 spaceId 时退化为旧行为。
    const targetSpace = this.data.space
    try {
      await destroyCoupleSpace(targetSpace)
    } catch (error) {
      if (this.pageDisposed) return
      const message = buildDestroyErrorMessage(error)
      this.setData({ destroying: false, destroyError: message })
      wx.showToast({ title: message, icon: 'none', duration: 2500 })
      // 状态类拒绝必须强制刷新，让页面与服务端保持一致。
      // 20103（目标空间已变化）明确要求先刷新，同样走这条分支。
      if (isDestroyRejectedByServer(error)) {
        await this.resyncAfterDestroyRejected()
      }
      return
    }
    if (this.pageDisposed) return

    // 关键：以服务器 /space/status 为准。刷新失败时保留页面状态，绝不误判为已销毁。
    let snapshot
    try {
      snapshot = await refreshAfterSpaceChange('space-setup:destroyed')
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ destroying: false })
      wx.showToast({
        title: '销毁已提交，但空间状态刷新失败，请重新确认状态',
        icon: 'none',
        duration: 2500,
      })
      return
    }
    if (this.pageDisposed) return
    if (snapshot && snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
      // 服务器仍认为存在空间：不清理本地状态，提示用户重新确认。
      this.setData({ destroying: false })
      this.applySnapshot(snapshot)
      wx.showToast({ title: '空间状态尚未同步，请稍后重试', icon: 'none', duration: 2200 })
      return
    }

    clearSpaceLocalCache()
    // 销毁后空间从用户侧消失：清空本页状态并重建页面栈，避免返回键回到旧页面。
    this.spaceChangeSucceeded = false
    this.localSpace = null
    // 空间信息基线同步清空，避免退出编辑态后回填出已销毁空间的旧数据。
    this.spaceInfoBaseline = buildSpaceInfoBaseline(null)
    this.setData({
      destroying: false,
      destroyError: '',
      hasSpace: false,
      space: null,
      waiting: false,
      showDestroyEntry: false,
      canDestroyNow: false,
      destroyBlockReason: '',
      createdInvitation: null,
      createdInvitationLink: '',
      pendingInvitations: [],
      receivedInvitations: [],
      spaceInfo: { spaceName: '', description: '', loveStartTime: '', loveStartTimeText: '' },
      spaceInfoEditable: false,
      canEditSpaceInfo: false,
      editingSpaceInfo: false,
      spaceInfoForm: { spaceName: '', description: '', loveDate: '', loveTime: '' },
      spaceInfoNameCount: 0,
      spaceInfoDescriptionCount: 0,
      spaceInfoError: '',
      spaceInfoSyncError: '',
    })
    wx.showToast({ title: '情侣空间已销毁', icon: 'success', duration: 1500 })
    wx.reLaunch({
      url: PLAZA_ROUTE,
      fail: () => wx.reLaunch({ url: PROFILE_ROUTE }),
    })
  },

  /** 销毁被服务端拒绝后重新同步全局状态，让页面与服务端保持一致。 */
  async resyncAfterDestroyRejected() {
    try {
      const snapshot = await refreshAfterSpaceChange('space-setup:destroy-rejected')
      if (this.pageDisposed) return
      this.applySnapshot(snapshot, { silent: true })
    } catch (error) {
      // 刷新失败时保留现有页面与错误提示，用户可手动重新确认状态。
    }
  },

  /* ===================== 空间基础信息（名称 / 简介 / 恋爱开始时间） ===================== */

  /**
   * 由空间数据计算「空间信息」相关 data 补丁。
   *
   * 关键约定（草稿与状态同步）：
   * - 首次进入 / spaceId 变化 / 保存成功：用服务端数据回填表单与基线；
   * - **同一空间的后台刷新（onShow / applySnapshot）不得覆盖正在编辑的草稿**：
   *   editingSpaceInfo === true 且 spaceId 相同时，只更新基线来源数据（this.spaceInfoBaseline），
   *   表单字段保持用户输入；
   * - 另一半已加入（不可编辑）时强制退出编辑态，展示服务端数据。
   *
   * @param {object|null} space
   * @returns {{ patch: object, baseline: object, editable: boolean, keepDraft: boolean }}
   */
  buildSpaceInfoPatch(space) {
    const hasSpace = Boolean(space) && deriveHasSpace(space)
    const baseline = buildSpaceInfoBaseline(hasSpace ? space : null)
    const summary = describeSpaceInfo(hasSpace ? space : null)
    const editable = hasSpace && this.isSettingsMode === true && canEditSpaceInfo(space)
    const previous = this.spaceInfoBaseline || {}
    const sameSpace = String(baseline.spaceId) === String(previous.spaceId || '')
    // 编辑中且仍是同一个可编辑空间：只更新基线，绝不覆盖草稿。
    const keepDraft = this.data.editingSpaceInfo === true && sameSpace && editable
    const draft = keepDraft ? (this.data.spaceInfoForm || {}) : buildSpaceInfoDraft(baseline)
    const patch = {
      spaceInfo: summary,
      spaceInfoEditable: editable,
      canEditSpaceInfo: editable,
      editingSpaceInfo: keepDraft,
      spaceInfoNameCount: measureText(draft.spaceName),
      spaceInfoDescriptionCount: measureText(draft.description),
    }
    if (!keepDraft) patch.spaceInfoForm = draft
    return { patch, baseline, editable, keepDraft }
  },

  /** 是否有未保存的空间信息草稿（用于取消 / 返回的二次确认）。 */
  hasUnsavedSpaceInfoDraft() {
    if (this.data.editingSpaceInfo !== true) return false
    return isSpaceInfoDirty(this.data.spaceInfoForm, this.spaceInfoBaseline)
  },

  /** 进入编辑态：以最近一次服务端确认的数据作为草稿起点。 */
  onEditSpaceInfo() {
    if (!this.data.spaceInfoEditable) return
    if (this.data.savingSpaceInfo || this.data.destroying) return
    const draft = buildSpaceInfoDraft(this.spaceInfoBaseline)
    this.setData({
      editingSpaceInfo: true,
      spaceInfoForm: draft,
      spaceInfoNameCount: measureText(draft.spaceName),
      spaceInfoDescriptionCount: measureText(draft.description),
      spaceInfoError: '',
      spaceInfoSyncError: '',
    })
  },

  /** 空间名称输入：已声明 maxlength，这里仍按上限截断做防御。 */
  onSpaceInfoNameInput(event) {
    const value = String((event.detail && event.detail.value) || '').slice(0, SPACE_INFO_NAME_MAX)
    this.setData({
      'spaceInfoForm.spaceName': value,
      spaceInfoNameCount: measureText(value),
      spaceInfoError: '',
    })
  },

  /** 空间简介输入：同名称，空字符串表示清空简介。 */
  onSpaceInfoDescriptionInput(event) {
    const value = String((event.detail && event.detail.value) || '').slice(0, SPACE_INFO_DESCRIPTION_MAX)
    this.setData({
      'spaceInfoForm.description': value,
      spaceInfoDescriptionCount: measureText(value),
      spaceInfoError: '',
    })
  },

  /** 原生日期 picker（mode="date"）选择结果。 */
  onLoveDateChange(event) {
    const value = String((event.detail && event.detail.value) || '').trim()
    this.setData({ 'spaceInfoForm.loveDate': value, spaceInfoError: '' })
  },

  /** 原生时间 picker（mode="time"，分钟精度）选择结果。 */
  onLoveTimeChange(event) {
    const value = String((event.detail && event.detail.value) || '').trim()
    this.setData({ 'spaceInfoForm.loveTime': value, spaceInfoError: '' })
  },

  /** 清空恋爱开始时间：提交时由纯函数转成 null（不是空字符串）。 */
  onClearLoveStartTime() {
    if (!this.data.editingSpaceInfo) return
    this.setData({
      'spaceInfoForm.loveDate': '',
      'spaceInfoForm.loveTime': '',
      spaceInfoError: '',
    })
  },

  /** 退出编辑态：草稿恢复为最近一次服务端确认的数据（不发请求）。 */
  exitSpaceInfoEditing() {
    const draft = buildSpaceInfoDraft(this.spaceInfoBaseline)
    const patch = {
      editingSpaceInfo: false,
      spaceInfoForm: draft,
      spaceInfoNameCount: measureText(draft.spaceName),
      spaceInfoDescriptionCount: measureText(draft.description),
      spaceInfoError: '',
    }
    // 无空间（例如销毁后）时不要回填出「幽灵」表单内容。
    if (!this.data.hasSpace) {
      patch.spaceInfoForm = { spaceName: '', description: '', loveDate: '', loveTime: '' }
      patch.spaceInfoNameCount = 0
      patch.spaceInfoDescriptionCount = 0
    }
    this.setData(patch)
  },

  /**
   * 「放弃未保存的修改？」二次确认。
   *
   * 确认链进行中再次调用直接忽略，避免叠加多个弹窗。
   */
  confirmDiscardSpaceInfoDraft(onConfirm) {
    if (this.spaceInfoDiscardConfirming) return
    this.spaceInfoDiscardConfirming = true
    const finish = (confirmed) => {
      this.spaceInfoDiscardConfirming = false
      if (this.pageDisposed) return
      if (confirmed && typeof onConfirm === 'function') onConfirm()
    }
    wx.showModal({
      title: '放弃未保存的修改？',
      content: '空间名称、简介或恋爱开始时间有未保存的修改，放弃后不会保存。',
      confirmText: '放弃修改',
      cancelText: '继续编辑',
      confirmColor: '#b85060',
      success: (result) => finish(Boolean(result && result.confirm)),
      fail: () => finish(false),
    })
  },

  /** 取消编辑：有草稿时二次确认；确认后恢复服务端数据且不发请求。 */
  onCancelSpaceInfo() {
    if (this.data.savingSpaceInfo) return
    if (this.hasUnsavedSpaceInfoDraft()) {
      this.confirmDiscardSpaceInfoDraft(() => this.exitSpaceInfoEditing())
      return
    }
    this.exitSpaceInfoEditing()
  },

  /**
   * 保存空间基础信息（POST /space/update）。
   *
   * 交互约定：
   * 1. 与销毁互斥：destroying 时不可保存；保存中不可再点；
   * 2. 长度 / 时间选择不完整时给出明确错误，不提交；
   * 3. 未修改时不发请求（草稿与基线比较，空字符串与 null 等价，时间按秒归一）；
   * 4. 失败保留用户输入，只有「关系已变化」类拒绝才强制刷新并转只读；
   * 5. 成功后先用接口返回的 SpaceStatusVO 更新基线与展示，再刷新全局状态；
   * 6. 状态刷新失败 ≠ 保存失败：给出独立提示与「只重试同步」入口。
   */
  async onSaveSpaceInfo() {
    if (this.data.savingSpaceInfo) return
    // 与销毁互斥：销毁进行中不允许保存。
    if (this.data.destroying) return
    if (!this.data.editingSpaceInfo || !this.data.spaceInfoEditable) return
    const draft = this.data.spaceInfoForm || {}
    const validationError = buildSpaceInfoValidationError(draft)
    if (validationError) {
      this.setData({ spaceInfoError: validationError })
      return
    }
    const baseline = this.spaceInfoBaseline
    if (!isSpaceInfoDirty(draft, baseline)) {
      // 没有实际修改：不发请求，直接回到只读摘要。
      this.exitSpaceInfoEditing()
      return
    }
    const payload = buildSpaceInfoUpdatePayload(draft, baseline)
    this.setData({ savingSpaceInfo: true, spaceInfoError: '', spaceInfoSyncError: '' })
    let updated
    try {
      updated = await updateCoupleSpace(payload)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ savingSpaceInfo: false })
      this.handleSpaceInfoUpdateFailure(error)
      return
    }
    if (this.pageDisposed) return
    this.setData({ savingSpaceInfo: false })
    this.applySpaceInfoUpdateSuccess(updated)
    wx.showToast({ title: '空间信息已更新', icon: 'success', duration: 1500 })
    await this.syncSpaceInfoAfterSave()
  },

  /**
   * 保存成功：用接口返回的 SpaceStatusVO 更新本页展示与表单基线。
   *
   * 推荐保留编辑态（用户可能继续微调），但基线必须换成服务端最新值，
   * 否则「未修改不发请求」的判断会失真。
   */
  applySpaceInfoUpdateSuccess(updated) {
    const space = updated && typeof updated === 'object' && deriveHasSpace(updated) ? updated : null
    if (!space) return
    const baseline = buildSpaceInfoBaseline(space)
    const summary = describeSpaceInfo(space)
    const editable = this.isSettingsMode === true && canEditSpaceInfo(space)
    const draft = buildSpaceInfoDraft(baseline)
    this.spaceInfoBaseline = baseline
    const memberCount = numberOrZero(space.memberCount)
    const waiting = isWaitingForPartner(space)
    this.setData({
      // 本页展示（空间名称 / 摘要）以接口返回为准，避免等待全局刷新期间显示旧名称。
      space,
      spaceName: typeof space.spaceName === 'string' ? space.spaceName : '',
      memberCount,
      waiting,
      spaceStatusText: describeSpaceStatus(space),
      spaceSummary: describeSpaceSummary(space, true, waiting, memberCount),
      spaceInfo: summary,
      spaceInfoEditable: editable,
      canEditSpaceInfo: editable,
      editingSpaceInfo: editable,
      spaceInfoForm: draft,
      spaceInfoNameCount: measureText(draft.spaceName),
      spaceInfoDescriptionCount: measureText(draft.description),
      spaceInfoError: '',
      spaceInfoSyncError: '',
    }, () => {
      this.applyPageChrome()
    })
  },

  /**
   * 保存后的全局状态刷新（复用 session-state，不自己造缓存）。
   *
   * 刷新失败时只提示「空间信息已保存，但状态同步失败」，保留草稿与展示，
   * 不重发更新请求，也不把已成功的保存说成失败。
   */
  async syncSpaceInfoAfterSave() {
    let snapshot
    try {
      snapshot = await refreshAfterSpaceChange('space-setup:space-updated')
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ spaceInfoSyncError: SPACE_INFO_SYNC_ERROR_MESSAGE })
      return
    }
    if (this.pageDisposed) return
    if (!snapshot || snapshot.status === SESSION_STATUS.ERROR) {
      this.setData({ spaceInfoSyncError: SPACE_INFO_SYNC_ERROR_MESSAGE })
      return
    }
    this.setData({ spaceInfoSyncError: '' })
    // silent：设置模式不在这里决定落点，避免刷新回调把用户弹走。
    this.applySnapshot(snapshot, { silent: true })
  },

  /** 「只重试同步」：仅重新拉取全局状态，绝不重新提交 /space/update。 */
  async retrySpaceInfoSync() {
    if (this.data.syncingSpaceInfo) return
    this.setData({ syncingSpaceInfo: true })
    let snapshot
    try {
      snapshot = await refreshAfterSpaceChange('space-setup:space-info-retry-sync')
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ syncingSpaceInfo: false, spaceInfoSyncError: SPACE_INFO_SYNC_ERROR_MESSAGE })
      return
    }
    if (this.pageDisposed) return
    this.setData({ syncingSpaceInfo: false })
    if (!snapshot || snapshot.status === SESSION_STATUS.ERROR) {
      this.setData({ spaceInfoSyncError: SPACE_INFO_SYNC_ERROR_MESSAGE })
      return
    }
    this.setData({ spaceInfoSyncError: '' })
    wx.showToast({ title: '状态已同步', icon: 'success', duration: 1200 })
    this.applySnapshot(snapshot, { silent: true })
  },

  /**
   * 保存失败处理。
   *
   * - 普通失败（网络 / 500 / 长度）：保留用户输入，仅展示错误文案，可重试；
   * - 关系已变化（20064 另一半已加入 / 20034 非成员 / 20058 已解绑 / 20103 空间变化）：
   *   说明原因 + 强制刷新状态 + 退出编辑态转只读，不覆盖服务端关系数据。
   */
  handleSpaceInfoUpdateFailure(error) {
    const message = buildSpaceInfoErrorMessage(error, '空间信息保存失败，请稍后重试')
    if (!isSpaceInfoUpdateConflict(error)) {
      this.setData({ spaceInfoError: message })
      return
    }
    this.setData({ spaceInfoError: message, editingSpaceInfo: false })
    this.refreshSpaceInfoAfterConflict()
  },

  /** 关系已变化后强制刷新全局状态，让页面按服务端真实数据转为只读。 */
  async refreshSpaceInfoAfterConflict() {
    try {
      const snapshot = await refreshAfterSpaceChange('space-setup:space-update-conflict')
      if (this.pageDisposed) return
      // applySnapshot 会按服务端数据重新计算可编辑性（另一半加入后即转为只读）。
      this.applySnapshot(snapshot, { silent: true })
    } catch (error) {
      // 刷新失败时保留现有页面与错误提示，用户可手动重新确认状态。
    }
  },

  /* ===================== 错误与重试 ===================== */

  /** 错误态重试：必须强制重新查询状态，否则会读到已缓存的 error 快照。 */
  onRetryPage() {
    this.bootstrap({ force: true })
  },

  /* ===================== 创建 / 绑定成功后的状态收敛 ===================== */

  /**
   * 用创建 / 绑定接口明确返回的 SpaceStatusVO 立即更新本页状态。
   *
   * 目的：接口已经成功时，页面不再展示创建表单，避免用户重复提交；
   * 全局状态仍以随后的 refreshAfterSpaceChange 为准（成功则覆盖，失败则保留本页已创建状态）。
   *
   * @param {object|null} space 创建 / 绑定接口返回的空间数据
   */
  applySpaceChangeLocally(space) {
    this.spaceChangeSucceeded = true
    this.localSpace = deriveHasSpace(space) ? space : null
    const waiting = isWaitingForPartner(this.localSpace)
    const memberCount = this.localSpace ? numberOrZero(this.localSpace.memberCount) : 0
    this.setData({
      hasSpace: true,
      space: this.localSpace,
      spaceName: this.localSpace && typeof this.localSpace.spaceName === 'string'
        ? this.localSpace.spaceName
        : '',
      waiting,
      memberCount,
      spaceStatusText: describeSpaceStatus(this.localSpace),
      spaceSummary: describeSpaceSummary(this.localSpace, true, waiting, memberCount),
      canInviteNow: deriveCanInviteNow(this.localSpace),
      canManageInvitations: this.isSettingsMode === true && deriveCanInviteNow(this.localSpace),
      notLoggedIn: false,
      showDestroyEntry: canShowDestroyEntry(this.localSpace),
      canDestroyNow: canDestroySpace(this.localSpace),
      destroyBlockReason: destroyBlockReason(this.localSpace),
      pageError: '',
      createError: '',
      bindError: '',
      bindInfo: '',
      syncError: '',
      syncErrorTitle: '',
    }, () => {
      this.applyPageChrome()
    })
  },

  /**
   * 创建 / 绑定成功后的全局状态刷新。
   *
   * 关键约定：写操作已经明确成功，本方法只负责「刷新全局状态」，
   * 失败时给出独立的同步错误提示与重试入口，绝不回滚成本页“未创建”，
   * 也绝不把刷新异常说成“创建 / 绑定失败”。
   *
   * @param {'create'|'bind'} kind
   */
  async syncAfterSpaceChange(kind) {
    const source = kind === 'bind' ? 'bind' : 'create'
    this.pendingSyncKind = source
    let snapshot
    try {
      snapshot = await refreshAfterSpaceChange(
        source === 'create' ? 'space-setup:created' : 'space-setup:bound',
      )
    } catch (error) {
      // refreshSpaceStatus 内部已把网络 / 服务异常收敛为 error 快照，这里只做兜底：
      // 无论如何都不能把刷新异常升级成“创建 / 绑定失败”。
      if (this.pageDisposed) return
      this.showSyncError(source, {
        spaceError: getErrorMessage(error, SYNC_ERROR_MESSAGE),
      })
      return
    }
    if (this.pageDisposed) return
    if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
      wx.showToast({
        title: source === 'create' ? '情侣空间创建成功' : '已加入情侣空间',
        icon: 'success',
        duration: 1400,
      })
      this.setData({
        creating: false,
        binding: false,
        syncError: '',
        syncErrorTitle: '',
        receivedInvitations: source === 'bind' ? [] : this.data.receivedInvitations,
      })
      // silent：落点由下面统一决定，避免 applySnapshot 回调里再跳一次造成重复 reLaunch。
      this.applySnapshot(snapshot, { silent: true })
      // 等待另一半加入时留在本页，引导生成邀请链接。
      if (isWaitingForPartner(snapshot.space)) {
        if (source === 'create') this.generateInvitationLink()
        return
      }
      this.leaveAfterSuccess(snapshot)
      return
    }
    if (snapshot.status === SESSION_STATUS.UNAUTHENTICATED) {
      // 401 / 20002：登录态已失效，按项目既有语义交给 session-state 收敛为未登录。
      // 不吞掉真实错误，也不把本页残留在“已创建”状态。
      this.spaceChangeSucceeded = false
      this.localSpace = null
      this.setData({ creating: false, binding: false })
      this.applySnapshot(snapshot)
      return
    }
    if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE) {
      // 刷新本身成功、但服务端明确表示没有空间：以服务端结果为准（不伪造 created 状态）。
      this.spaceChangeSucceeded = false
      this.localSpace = null
      this.setData({ creating: false, binding: false })
      this.applySnapshot(snapshot)
      return
    }
    // 网络 / 服务异常：创建 / 绑定已经成功，只提示“状态刷新失败”，保留已创建状态。
    this.setData({ creating: false, binding: false })
    this.showSyncError(source, snapshot)
  },

  /** 展示“已创建 / 已绑定，但状态刷新失败”的独立提示（与创建失败严格区分）。 */
  showSyncError(kind, snapshot) {
    this.pendingSyncKind = kind === 'bind' ? 'bind' : 'create'
    const message = snapshot && (snapshot.spaceError || snapshot.authError)
    this.setData({
      creating: false,
      binding: false,
      syncErrorTitle: kind === 'bind' ? BIND_SYNC_ERROR_TITLE : CREATE_SYNC_ERROR_TITLE,
      syncError: message || SYNC_ERROR_MESSAGE,
    })
  },

  /** 同步失败后的重试入口：重试成功则恢复完整状态并清除同步错误。 */
  async onRetrySync() {
    if (this.data.syncing) return
    const kind = this.pendingSyncKind === 'bind' ? 'bind' : 'create'
    this.setData({ syncing: true })
    let snapshot
    try {
      snapshot = await refreshAfterSpaceChange('space-setup:retry-sync')
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ syncing: false })
      this.showSyncError(kind, { spaceError: getErrorMessage(error, SYNC_ERROR_MESSAGE) })
      return
    }
    if (this.pageDisposed) return
    this.setData({ syncing: false })
    if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
      wx.showToast({ title: '状态已同步', icon: 'success', duration: 1200 })
      this.setData({ syncError: '', syncErrorTitle: '' })
      // silent：落点由下面统一决定，避免重复 reLaunch。
      this.applySnapshot(snapshot, { silent: true })
      if (isWaitingForPartner(snapshot.space)) {
        if (!this.data.createdInvitationLink) this.generateInvitationLink()
        return
      }
      this.leaveAfterSuccess(snapshot)
      return
    }
    if (snapshot.status === SESSION_STATUS.UNAUTHENTICATED) {
      this.spaceChangeSucceeded = false
      this.localSpace = null
      this.applySnapshot(snapshot)
      return
    }
    if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE) {
      this.spaceChangeSucceeded = false
      this.localSpace = null
      this.applySnapshot(snapshot)
      return
    }
    this.showSyncError(kind, snapshot)
  },

  /* ===================== 创建 ===================== */

  onNameInput(event) {
    this.setData({ 'form.spaceName': String(event.detail.value || '').slice(0, SPACE_NAME_MAX), createError: '' })
  },

  onDescriptionInput(event) {
    this.setData({ 'form.description': String(event.detail.value || '').slice(0, DESCRIPTION_MAX), createError: '' })
  },

  async onCreate() {
    if (this.data.creating) return
    // 创建已经明确成功过（哪怕后续同步失败）：不允许再次提交，避免后端返回 20033。
    if (this.spaceChangeSucceeded) return
    const name = this.data.form.spaceName.trim()
    if (name.length > SPACE_NAME_MAX) {
      this.setData({ createError: `空间名称不能超过 ${SPACE_NAME_MAX} 个字符` })
      return
    }
    this.setData({ creating: true, createError: '' })
    let created
    try {
      created = await createCoupleSpace({
        spaceName: name,
        description: this.data.form.description.trim(),
        loveStartTime: toBackendDateTime(this.data.form.loveStartTime),
      })
    } catch (error) {
      // 只有创建接口本身失败（HTTP / body.success 不通过）才展示创建错误。
      if (this.pageDisposed) return
      this.setData({
        creating: false,
        createError: getErrorMessage(error, '创建情侣空间失败，请稍后重试'),
      })
      return
    }
    if (this.pageDisposed) return
    // HTTP 2xx 且 body.success=true 即视为创建成功：先用接口返回的 SpaceStatusVO 落本页状态，
    // 再强制刷新全局会话状态；后续刷新失败不会再展示“创建失败”。
    this.applySpaceChangeLocally(created)
    this.setData({ creating: false })
    await this.syncAfterSpaceChange('create')
  },

  /* ===================== 创建邀请链接（等待另一半加入时） ===================== */

  async generateInvitationLink() {
    if (this.data.invitationLinkLoading) return
    this.setData({ invitationLinkLoading: true, invitationLinkError: '' })
    try {
      const result = await createSpaceInvitation()
      const token = result && typeof result.token === 'string' ? result.token.trim() : ''
      if (!token) throw new Error('邀请链接生成失败，请重试')
      this.createdInvitationToken = token
      if (this.pageDisposed) return
      this.setData({
        invitationLinkLoading: false,
        createdInvitationLink: `/pages/space-setup/index?token=${encodeURIComponent(token)}`,
      })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        invitationLinkLoading: false,
        invitationLinkError: getErrorMessage(error, '邀请链接生成失败，请重试'),
      })
    }
  },

  /** 复制邀请令牌（小程序内不能直接复制按钮，走剪贴板 + toast）。 */
  onCopyInvitation() {
    const token = this.createdInvitationToken || ''
    if (!token) {
      this.setData({ invitationLinkError: '还没有可复制的邀请，请先生成邀请链接' })
      return
    }
    wx.setClipboardData({
      data: token,
      success: () => wx.showToast({ title: '邀请令牌已复制', icon: 'success' }),
      fail: () => wx.showToast({ title: '复制失败，请手动记录', icon: 'none' }),
    })
  },

  /* ===================== 绑定 / 加入 ===================== */

  onInvitationInput(event) {
    this.setData({ invitationCode: String(event.detail.value || ''), bindError: '', bindInfo: '', preview: null })
  },

  async loadReceivedInvitations() {
    if (this.data.receivedLoading) return
    this.setData({ receivedLoading: true, receivedError: '' })
    try {
      const list = await fetchReceivedInvitations()
      if (this.pageDisposed) return
      this.setData({
        receivedLoading: false,
        receivedInvitations: list.filter(item => item && item.invitationId !== undefined && item.invitationId !== null),
      })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        receivedLoading: false,
        receivedError: getErrorMessage(error, '收到的邀请加载失败，请稍后重试'),
      })
    }
  },

  onRetryReceived() {
    this.loadReceivedInvitations()
  },

  /** 先预览邀请，让用户在绑定前确认对方是谁、空间是否可加入。 */
  async onPreviewInvitation() {
    const token = extractInvitationToken(this.data.invitationCode)
    if (!token) {
      this.setData({ bindError: '请输入邀请链接或邀请令牌', preview: null })
      return
    }
    this.previewToken = token
    this.setData({ previewing: true, bindError: '', bindInfo: '', preview: null })
    try {
      const preview = await previewInvitation(token)
      if (this.pageDisposed) return
      if (!preview || typeof preview !== 'object') throw new Error('邀请信息无效')
      this.setData({
        previewing: false,
        preview,
        bindInfo: preview.joinable === false
          ? (preview.message || '这个邀请暂时无法接受')
          : '',
      })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        previewing: false,
        bindError: getErrorMessage(error, '邀请预览失败，请检查链接后重试'),
      })
    }
  },

  /** 接受邀请（链接 / 令牌入口）。 */
  async onAcceptByToken() {
    if (this.data.binding) return
    // 绑定已经明确成功过（哪怕后续同步失败）：不允许重复提交。
    if (this.spaceChangeSucceeded) return
    const token = this.previewToken || extractInvitationToken(this.data.invitationCode)
    if (!token) {
      this.setData({ bindError: '请输入邀请链接或邀请令牌' })
      return
    }
    this.setData({ binding: true, bindError: '', bindInfo: '' })
    let accepted
    try {
      accepted = await acceptInvitation({ token })
    } catch (error) {
      // 只有绑定接口本身失败才展示绑定错误。
      if (this.pageDisposed) return
      this.setData({
        binding: false,
        bindError: getErrorMessage(error, '接受邀请失败，请稍后重试'),
      })
      return
    }
    if (this.pageDisposed) return
    this.applySpaceChangeLocally(accepted)
    this.setData({ binding: false })
    await this.finishBinding()
  },

  /** 接受「我收到的邀请」列表中的某一条。 */
  async onAcceptReceived(event) {
    if (this.data.binding) return
    if (this.spaceChangeSucceeded) return
    const rawId = String(event.currentTarget.dataset.id || '')
    if (!INVITATION_ID_PATTERN.test(rawId)) {
      this.setData({ bindError: '邀请信息不完整，请刷新后重试' })
      return
    }
    this.setData({ binding: true, bindError: '', bindInfo: '' })
    let accepted
    try {
      accepted = await acceptInvitation({ invitationId: Number(rawId) })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        binding: false,
        bindError: getErrorMessage(error, '接受邀请失败，请稍后重试'),
      })
      return
    }
    if (this.pageDisposed) return
    this.applySpaceChangeLocally(accepted)
    this.setData({ binding: false })
    await this.finishBinding()
  },

  /**
   * 绑定成功：强制刷新全局状态后恢复完整 Tab。
   *
   * 绑定接口已经明确成功，刷新失败时只提示「已加入、状态刷新失败」并提供重试，
   * 不再误报「绑定结果暂未同步」。
   */
  async finishBinding() {
    await this.syncAfterSpaceChange('bind')
  },

  /* ===================== 设置模式的入口 / 返回 ===================== */

  /**
   * 设置模式无空间时的「创建」入口。
   *
   * 复用 access-control 的统一入口（登录态检查 + 跳转 + 失败兜底），
   * 不在页面里重复实现导航与鉴权。
   */
  onCreateMode() {
    openSpaceSetup('create')
  },

  /** 设置模式无空间时的「绑定 / 加入」入口。 */
  onBindMode() {
    openSpaceSetup('bind')
  },

  /** 设置模式已有空间的「进入情侣空间」入口。 */
  onOpenSpaceHome() {
    wx.reLaunch({
      url: SPACE_HOME_ROUTE,
      fail: () => wx.reLaunch({ url: PROFILE_ROUTE }),
    })
  },

  /**
   * 进入空间内容编辑工作台。
   *
   * 新页面按 SPACE 级别守卫，无空间 / 未登录时由统一入口拦截；
   * 创建成功后的等待绑定阶段也可以直接进入，提前布置内容。
   */
  onOpenStudio() {
    navigateWithGuard('/pages/space-studio/index')
  },

  /** 设置模式未登录时的登录入口（守卫通常已经先跳登录页，这里只做兜底）。 */
  onGoLogin() {
    openSpaceSetup('settings')
  },

  /**
   * 导航栏返回按钮兜底。
   *
   * navigation-bar 组件内部会先调用 wx.navigateBack；若本页是分享 / 扫码直达的栈底页面，
   * 该调用不会生效，用户会以为「返回键坏了」。这里按进入时的栈深度判断，栈底时重建「我的」。
   */
  onNavBack() {
    const depth = this.pageDepth || readPageDepth()
    // 有未保存的空间信息草稿时给一次确认，但绝不阻碍正常导航：
    // 用户确认后按原路径正常返回（栈内 navigateBack / 栈底兜底「我的」）。
    if (this.hasUnsavedSpaceInfoDraft() && this.spaceInfoLeaveConfirming !== true) {
      this.spaceInfoLeaveConfirming = true
      wx.showModal({
        title: '放弃未保存的修改？',
        content: '空间名称、简介或恋爱开始时间有未保存的修改，返回后不会保存。',
        confirmText: '放弃并返回',
        cancelText: '继续编辑',
        confirmColor: '#b85060',
        success: (result) => {
          this.spaceInfoLeaveConfirming = false
          if (this.pageDisposed) return
          if (!result || !result.confirm) return
          this.leaveSpaceSetupPage(depth)
        },
        fail: () => { this.spaceInfoLeaveConfirming = false },
      })
      return
    }
    if (depth > 1) return
    this.onBackToProfile()
  },

  /** 按进入时的栈深度离开本页：栈内正常返回，栈底兜底重建「我的」。 */
  leaveSpaceSetupPage(depth) {
    // 页面已经卸载（例如组件自身的 navigateBack 先执行）：不能再补一次返回，
    // 否则会多弹一层页面栈。
    if (this.pageDisposed) return
    const currentDepth = depth || this.pageDepth || readPageDepth()
    if (currentDepth > 1) {
      wx.navigateBack({ delta: 1, fail: () => this.onBackToProfile() })
      return
    }
    this.onBackToProfile()
  },

  /** 页面卸载 / 销毁时释放返回确认标记，避免状态残留到下一个页面。 */
  disableLeaveGuard() {
    this.spaceInfoLeaveConfirming = false
    this.spaceInfoDiscardConfirming = false
  },

  /** 兜底离开：回到「我的」，失败时退到公开的恋爱广场。 */
  onBackToProfile() {
    wx.reLaunch({
      url: PROFILE_ROUTE,
      fail: () => wx.reLaunch({ url: PLAZA_ROUTE }),
    })
  },

  /* ===================== 其它 ===================== */

  /** 状态一直无法确认时，重新走一次完整确认流程。 */
  async onRecheck() {
    this.setData({ loading: true, pageError: '' })
    const snapshot = await refreshSession({ force: true, reason: 'space-setup:recheck' }).catch(() => getSnapshot())
    if (this.pageDisposed) return
    this.setData({ loading: false })
    this.applySnapshot(snapshot)
  },
}, 'pages/space-setup/index'))
