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
} = require('../../utils/session-constants')
const { isWaitingForPartner } = require('../../utils/session-rules')

const SPACE_NAME_MAX = 30
const DESCRIPTION_MAX = 500
const INVITATION_ID_PATTERN = /^\d{1,18}$/

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
  },

  onLoad(query) {
    this.pageDisposed = false
    const action = query && typeof query.action === 'string' ? query.action : ''
    this.initialAction = action === 'bind' ? 'bind' : (action === 'create' ? 'create' : '')
    this.bootstrap()
  },

  onShow() {
    // 从登录页 / 邀请确认回来时重新确认状态，避免继续按旧状态渲染。
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
    if (this.data.hasSpace) {
      // 已有空间：不需要创建 / 绑定，直接回到「我的」或情侣空间首页。
      this.leaveAfterSuccess(snapshot)
      return
    }
    if (this.initialAction === 'bind') this.loadReceivedInvitations()
  },

  applySnapshot(snapshot, options) {
    if (!snapshot) return
    const hasSpace = snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
    this.setData({
      hasSpace,
      space: snapshot.space || null,
      waiting: isWaitingForPartner(snapshot.space),
      pageError: snapshot.status === SESSION_STATUS.ERROR
        ? (snapshot.authError || snapshot.spaceError || '情侣空间状态加载失败，请重试')
        : '',
    }, () => {
      if (hasSpace && this.initialized && !(options && options.silent)) {
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

  /* ===================== 错误与重试 ===================== */

  onRetryPage() {
    this.bootstrap()
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
    const name = this.data.form.spaceName.trim()
    if (name.length > SPACE_NAME_MAX) {
      this.setData({ createError: `空间名称不能超过 ${SPACE_NAME_MAX} 个字符` })
      return
    }
    this.setData({ creating: true, createError: '' })
    try {
      await createCoupleSpace({
        spaceName: name,
        description: this.data.form.description.trim(),
        loveStartTime: toBackendDateTime(this.data.form.loveStartTime),
      })
      // 必须以服务端为准重新拉取状态，不能凭创建接口的返回值伪造全局状态。
      const snapshot = await refreshAfterSpaceChange('space-setup:created').catch(() => getSnapshot())
      if (this.pageDisposed) return
      if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
        wx.showToast({ title: '情侣空间创建成功', icon: 'success', duration: 1400 })
        this.applySnapshot(snapshot)
        // 等待另一半加入时留在本页，引导生成邀请链接。
        if (isWaitingForPartner(snapshot.space)) {
          this.setData({ creating: false })
          this.generateInvitationLink()
          return
        }
        this.setData({ creating: false })
        this.leaveAfterSuccess(snapshot)
        return
      }
      this.setData({
        creating: false,
        pageError: snapshot.spaceError || '空间状态暂未同步，请点击重试',
      })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        creating: false,
        createError: getErrorMessage(error, '创建情侣空间失败，请稍后重试'),
      })
    }
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
    const token = this.previewToken || extractInvitationToken(this.data.invitationCode)
    if (!token) {
      this.setData({ bindError: '请输入邀请链接或邀请令牌' })
      return
    }
    this.setData({ binding: true, bindError: '', bindInfo: '' })
    try {
      await acceptInvitation({ token })
      await this.finishBinding()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        binding: false,
        bindError: getErrorMessage(error, '接受邀请失败，请稍后重试'),
      })
    }
  },

  /** 接受「我收到的邀请」列表中的某一条。 */
  async onAcceptReceived(event) {
    if (this.data.binding) return
    const rawId = String(event.currentTarget.dataset.id || '')
    if (!INVITATION_ID_PATTERN.test(rawId)) {
      this.setData({ bindError: '邀请信息不完整，请刷新后重试' })
      return
    }
    this.setData({ binding: true, bindError: '', bindInfo: '' })
    try {
      await acceptInvitation({ invitationId: Number(rawId) })
      await this.finishBinding()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        binding: false,
        bindError: getErrorMessage(error, '接受邀请失败，请稍后重试'),
      })
    }
  },

  /** 绑定成功：强制刷新全局状态后恢复完整 Tab。 */
  async finishBinding() {
    const snapshot = await refreshAfterSpaceChange('space-setup:bound').catch(() => getSnapshot())
    if (this.pageDisposed) return
    if (snapshot.status !== SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
      this.setData({
        binding: false,
        pageError: snapshot.spaceError || '绑定结果暂未同步，请点击重试',
      })
      return
    }
    this.setData({ binding: false, receivedInvitations: [] })
    wx.showToast({ title: '已加入情侣空间', icon: 'success', duration: 1400 })
    this.applySnapshot(snapshot)
    this.leaveAfterSuccess(snapshot)
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
