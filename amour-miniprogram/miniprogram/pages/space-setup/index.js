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
const { guardPageReady } = require('../../utils/access-control')
const { withPageViewTracking } = require('../../utils/page-view-lifecycle')
const {
  createCoupleSpace,
  createSpaceInvitation,
  destroyCoupleSpace,
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

const SPACE_NAME_MAX = 30
const DESCRIPTION_MAX = 500
const INVITATION_ID_PATTERN = /^\d{1,18}$/

/** 创建 / 绑定已成功、只是全局状态刷新失败时的提示标题与兜底文案。 */
const CREATE_SYNC_ERROR_TITLE = '情侣空间已创建，但状态刷新失败'
const BIND_SYNC_ERROR_TITLE = '已加入情侣空间，但状态刷新失败'
const SYNC_ERROR_MESSAGE = '状态刷新失败，请检查网络后重试'

function getErrorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.trim()) return error.message.trim()
  return fallback
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
    /** 当前空间状态（来自全局状态）；有空间时本页只做提示，不再展示创建入口 */
    hasSpace: false,
    space: null,
    spaceName: '',
    /** waiting：已完成创建，等待另一半加入 */
    waiting: false,
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
  },

  onLoad(query) {
    this.pageDisposed = false
    /** 创建 / 绑定接口是否已经明确成功（成功后不再允许重复提交）。 */
    this.spaceChangeSucceeded = false
    /** 创建 / 绑定成功后接口返回的空间数据，用于同步失败时兜底本页展示。 */
    this.localSpace = null
    /** 当前同步失败提示对应的来源：create / bind（重试时决定文案）。 */
    this.pendingSyncKind = 'create'
    const action = query && typeof query.action === 'string' ? query.action : ''
    this.initialAction = action === 'bind' ? 'bind' : (action === 'create' ? 'create' : '')
    this.bootstrap()
  },

  onShow() {
    // 从登录页 / 邀请确认回来时重新确认状态，避免继续按旧状态渲染。
    // silent：这里只同步数据，不在这里跳转；且 applySnapshot 会保护“刚创建成功”的本页状态。
    if (this.initialized) this.applySnapshot(getSnapshot(), { silent: true })
  },

  onUnload() {
    this.pageDisposed = true
  },

  /** 页面守卫 + 首次状态确认。 */
  async bootstrap() {
    this.setData({ loading: true, pageError: '' })
    const allowed = await guardPageReady('pages/space-setup/index', { silent: true })
    if (this.pageDisposed) return
    if (!allowed) return
    const snapshot = await ensureSessionReady().catch(() => getSnapshot())
    if (this.pageDisposed) return
    this.initialized = true
    // silent：bootstrap 自己决定落点，避免 applySnapshot 回调里重复跳转。
    this.applySnapshot(snapshot, { silent: true })
    this.setData({ loading: false })
    if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
      // 已有空间：不需要创建 / 绑定，直接回到「我的」或情侣空间首页。
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
    // 创建 / 绑定接口已经明确成功时，同步失败或旧快照都不得把本页回滚成“未创建”：
    // 否则页面会重新展示创建表单，用户可以再次点击创建（后端会返回 20033）。
    // 登录态失效（401 / 20002）例外：按项目既有语义交给 session-state 收敛为未登录。
    const keepLocalSpace = Boolean(this.spaceChangeSucceeded)
      && !globalHasSpace
      && snapshot.status !== SESSION_STATUS.UNAUTHENTICATED
    const space = globalHasSpace
      ? (snapshot.space || null)
      : (keepLocalSpace ? (this.localSpace || null) : null)
    const hasSpace = globalHasSpace || keepLocalSpace
    this.setData({
      hasSpace,
      space,
      waiting: isWaitingForPartner(space),
      showDestroyEntry: hasSpace && canShowDestroyEntry(space),
      canDestroyNow: hasSpace && canDestroySpace(space),
      destroyBlockReason: hasSpace && canShowDestroyEntry(space) ? destroyBlockReason(space) : '',
      pageError: !keepLocalSpace && snapshot.status === SESSION_STATUS.ERROR
        ? (snapshot.authError || snapshot.spaceError || '情侣空间状态加载失败，请重试')
        : '',
      // 全局状态恢复后，同步错误提示随之清除。
      syncError: globalHasSpace ? '' : this.data.syncError,
      syncErrorTitle: globalHasSpace ? '' : this.data.syncErrorTitle,
    }, () => {
      if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
        && this.initialized
        && !(options && options.silent)) {
        this.leaveAfterSuccess(snapshot)
      }
    })
  },

  /** 创建成功后的统一落点：有情侣空间 → 情侣空间首页；等待绑定 → 留在本页展示邀请。 */
  leaveAfterSuccess(snapshot) {
    if (snapshot && isWaitingForPartner(snapshot.space)) return
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
    const space = this.data.space
    wx.showModal({
      title: '销毁并清空情侣空间',
      content: buildDestroyPromptMessage(space),
      confirmText: DESTROY_CONFIRM_KEYWORD,
      cancelText: '取消',
      confirmColor: '#b85060',
      success: (result) => {
        if (result.confirm) this.confirmDestroySpaceWithInput()
      },
    })
  },

  /** 第二步确认：要求逐字输入「销毁」，避免误触。 */
  confirmDestroySpaceWithInput() {
    wx.showModal({
      title: `请输入“${DESTROY_CONFIRM_KEYWORD}”确认`,
      editable: true,
      placeholderText: `请输入${DESTROY_CONFIRM_KEYWORD}`,
      confirmText: '确认销毁',
      cancelText: '取消',
      confirmColor: '#b85060',
      success: (result) => {
        if (!result.confirm) return
        const error = validateDestroyConfirmInput(result.content)
        if (error) {
          wx.showToast({ title: error, icon: 'none', duration: 2000 })
          return
        }
        this.destroySpace()
      },
    })
  },

  /** 提交销毁请求。只有刷新确认服务器已无该空间后，才清理本地状态并离开。 */
  async destroySpace() {
    if (this.data.destroying) return
    this.setData({ destroying: true, destroyError: '' })
    try {
      await destroyCoupleSpace()
    } catch (error) {
      if (this.pageDisposed) return
      const message = buildDestroyErrorMessage(error)
      this.setData({ destroying: false, destroyError: message })
      wx.showToast({ title: message, icon: 'none', duration: 2500 })
      // 状态类拒绝必须强制刷新，让页面与服务端保持一致。
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

  /* ===================== 错误与重试 ===================== */

  onRetryPage() {
    this.bootstrap()
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
    this.setData({
      hasSpace: true,
      space: this.localSpace,
      waiting: isWaitingForPartner(this.localSpace),
      showDestroyEntry: canShowDestroyEntry(this.localSpace),
      canDestroyNow: canDestroySpace(this.localSpace),
      destroyBlockReason: canShowDestroyEntry(this.localSpace)
        ? destroyBlockReason(this.localSpace)
        : '',
      pageError: '',
      createError: '',
      bindError: '',
      bindInfo: '',
      syncError: '',
      syncErrorTitle: '',
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

  /* ===================== 其它 ===================== */

  /** 状态一直无法确认时，重新走一次完整确认流程。 */
  async onRecheck() {
    this.setData({ loading: true, pageError: '' })
    const snapshot = await refreshSession({ force: true, reason: 'space-setup:recheck' }).catch(() => getSnapshot())
    if (this.pageDisposed) return
    this.setData({ loading: false })
    this.applySnapshot(snapshot)
  },

  goProfile() {
    wx.reLaunch({ url: PROFILE_ROUTE })
  },
}, 'pages/space-setup/index'))
