/**
 * 空间内容编辑工作台（小程序）。
 *
 * 一个页面承载首页 / 故事 / 留言 / 相册 / 纪念日五类编辑能力：
 * - 页面访问级别为 SPACE：由 guardPageReady 复用统一会话检查，深链 / 分享同样受控；
 * - 栏目按 frontend:<module>:query 权限过滤，首页沿用 Web 现有做法（有效成员即可）；
 * - 所有写操作只调用后端已存在接口，目标空间由服务端按登录态推导；
 * - 等待绑定（status=0）允许创建者提前布置私密内容；显式公开必须在 status=1 时由服务端放行；
 * - 空间状态变化 / 权限冲突时刷新全局状态，不在本地伪造结果。
 */
const { guardPageReady } = require('../../utils/access-control')
const { withPageViewTracking } = require('../../utils/page-view-lifecycle')
const { hasFrontendQueryPermission } = require('../../utils/auth')
const sessionState = require('../../utils/session-state')
const { SESSION_STATUS, PROFILE_ROUTE } = require('../../utils/session-constants')
const api = require('../../utils/space-content-api')
const rules = require('../../utils/space-content-rules')

const MESSAGE_PAGE_SIZE = 8
const PHOTO_PAGE_SIZE = 10
const SPACE_CONTENT_EDITOR_ROUTE = '/pages/space-content-editor/index'

const EMPTY_HOME_FORM = {
  spaceName: '',
  description: '',
  loveDate: '',
  loveTime: '',
  boyName: '',
  girlName: '',
  boyAvatar: '',
  girlAvatar: '',
  heroPhoto1: '',
  heroPhoto2: '',
}

function formatDateTime(value, showTime) {
  return rules.formatContentDateTime(value, showTime)
}

function initials(name) {
  const text = String(name || '').trim()
  return text ? text.slice(0, 1).toUpperCase() : '恋'
}

function readPageDepth() {
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    return Array.isArray(pages) && pages.length ? pages.length : 1
  } catch (error) {
    return 1
  }
}

function confirmModal(title, content, confirmText) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText: confirmText || '确定',
      cancelText: '取消',
      confirmColor: '#b85060',
      success: result => resolve(Boolean(result && result.confirm)),
      fail: () => resolve(false),
    })
  })
}

function firstTouch(event) {
  const touches = event && (event.touches && event.touches.length
    ? event.touches
    : event.changedTouches)
  return touches && touches.length ? touches[0] : null
}

function reorderList(list, from, to) {
  const source = Array.isArray(list) ? list.slice() : []
  const start = Number(from)
  const end = Number(to)
  if (!Number.isInteger(start) || !Number.isInteger(end)) return source
  if (start < 0 || start >= source.length || end < 0 || end >= source.length) return source
  const [item] = source.splice(start, 1)
  source.splice(end, 0, item)
  return source
}

Page(withPageViewTracking({
  data: {
    /* 会话 / 页面状态 */
    loading: true,
    pageReady: false,
    pageError: '',
    space: null,
    spaceName: '',
    canEditContent: false,
    canPublish: false,
    editBlockedReason: '',
    tabs: [],
    activeTab: '',
    draftDirty: false,
    feedback: null,
    visibilityOptions: [],
    swipeKey: '',
    dragging: false,
    dragKind: '',
    dragItemId: 0,
    dragFromIndex: -1,
    dragToIndex: -1,
    dragListSnapshot: null,
    sortSaving: false,
    deleting: false,

    /* 公开审核：默认只展示一行摘要，展开后再看驳回原因与详情 */
    review: null,
    reviewLoading: false,
    reviewError: '',
    reviewExpanded: false,
    reviewSummary: '',
    reviewNeedsAttention: false,
    resubmitting: false,

    /* 首页 */
    homeLoading: true,
    homeError: '',
    homeSaving: false,
    homeLoaded: false,
    homeForm: { ...EMPTY_HOME_FORM },
    homeUploadingField: '',
    /** 首页保存成功但全局空间状态刷新失败：只提示并允许重试同步，不重复提交保存 */
    homeSyncError: '',
    homeSyncing: false,

    /* 故事 */
    storyLoading: true,
    storyError: '',
    chapters: [],
    nodes: [],
    visibleNodes: [],
    chapterOptions: [{ id: 0, name: '全部章节' }],
    chapterFilterIndex: 0,
    chapterFilterId: 0,

    /* 相册 */
    photoLoading: true,
    photoError: '',
    photoCategories: [],
    photoFilterOptions: [{ id: 0, categoryName: '全部分类' }],
    photoFilterIndex: 0,
    photoFilterId: 0,
    photos: [],
    photoCurrent: 1,
    photoTotal: 0,
    photoTotalPages: 1,
    photoSize: PHOTO_PAGE_SIZE,

    /* 纪念日 */
    anniversaryLoading: true,
    anniversaryError: '',
    anniversaries: [],

    /* 留言 */
    messageLoading: true,
    messageError: '',
    messages: [],
    messageCurrent: 1,
    messageTotal: 0,
    messageTotalPages: 1,
    messageSize: MESSAGE_PAGE_SIZE,
    messageDraft: '',
    messageDraftLength: 0,
    publishing: false,
    replyTargetId: '',
    replyDraft: '',
    replyDraftLength: 0,
    replying: false,
    messageActionError: '',
  },

  onLoad(query) {
    this.pageDisposed = false
    this.requestedTab = query && typeof query.tab === 'string' ? query.tab : ''
    this.loadedTabs = {}
    this.loadedSpaceId = null
    this.homeBaselineLoveStartTime = ''
    this.homeBaselineForm = { ...EMPTY_HOME_FORM }
    this.reviewRequestSeq = 0
    this.photoPageSeq = 0
    this.messagePageSeq = 0
    this.draftDirty = false
    this.editorOpen = false
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchAxis = ''
    this.suppressTapUntil = 0
    this.dragStartY = 0
    this.dragRects = []
    this.dragRowHeight = 88
    this.bootstrap()
    this.unsubscribe = sessionState.subscribe(snapshot => this.applySession(snapshot))
  },

  onShow() {
    if (!this.pageReady) return
    if (this.editorOpen) {
      this.editorOpen = false
      const key = this.data.activeTab
      if (key) {
        delete this.loadedTabs[key]
        this.loadTab(key)
        this.loadReview()
      }
    }
    // 从图片选择 / 其它页面返回时重新对齐空间状态；不重复拉取已加载的列表。
    const snapshot = sessionState.getSnapshot()
    if (snapshot.status !== SESSION_STATUS.LOADING) this.applySession(snapshot)
  },

  onUnload() {
    this.pageDisposed = true
    if (typeof this.unsubscribe === 'function') this.unsubscribe()
    this.unsubscribe = undefined
  },

  /* ===================== 状态与导航 ===================== */

  async bootstrap() {
    this.setData({ loading: true, pageError: '' })
    const allowed = await guardPageReady('pages/space-studio/index', { silent: true })
    if (this.pageDisposed) return
    if (!allowed) return
    const snapshot = await sessionState.ensureSessionReady().catch(() => sessionState.getSnapshot())
    if (this.pageDisposed) return
    this.pageReady = true
    this.applySession(snapshot)
  },

  async onRetryPage() {
    this.setData({ loading: true, pageError: '' })
    const snapshot = await sessionState.refreshSession({ force: true, reason: 'space-studio:retry' })
      .catch(() => sessionState.getSnapshot())
    if (this.pageDisposed) return
    this.applySession(snapshot)
  },

  /**
   * 应用会话快照。
   *
   * 只在这里决定栏目可见性、可编辑性与是否重新加载，避免各模块重复判断状态。
   */
  applySession(snapshot) {
    if (!snapshot || this.pageDisposed) return
    if (snapshot.status === SESSION_STATUS.LOADING) {
      this.setData({ loading: true })
      return
    }
    // 守卫尚未确认访问资格前不渲染受限内容，避免无空间用户先看到编辑界面再被踢走。
    if (!this.pageReady) return
    const hasSpace = snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
    const space = hasSpace ? (snapshot.space || null) : null
    const tabs = rules.resolveContentTabs(hasFrontendQueryPermission)
    // 首次进入用 URL 指定的栏目；之后状态刷新必须保留用户当前所在栏目。
    const requested = this.data.activeTab || this.requestedTab
    const activeTab = rules.resolveActiveContentTab(requested, tabs)
    const canEditContent = rules.canEditSpaceContent(space)
    const canPublish = rules.canPublishContent(space)
    const visibilityOptions = rules.buildVisibilityOptions(canPublish)
    let editBlockedReason = ''
    if (!hasSpace) {
      editBlockedReason = '当前没有可编辑的情侣空间'
    } else if (!canEditContent) {
      editBlockedReason = '当前空间状态不允许编辑内容。冻结或归档需要先恢复；解绑或销毁后请重新创建空间。'
    } else if (!tabs.length) {
      editBlockedReason = '当前账号没有可用的内容管理权限'
    }
    const pageError = snapshot.status === SESSION_STATUS.ERROR
      ? (snapshot.spaceError || snapshot.authError || '情侣空间状态暂时无法确认')
      : ''

    const patch = {
      loading: false,
      pageReady: true,
      pageError,
      space,
      spaceName: space && typeof space.spaceName === 'string' ? space.spaceName : '',
      canEditContent,
      canPublish,
      editBlockedReason,
      tabs,
      activeTab,
      visibilityOptions,
    }
    this.setData(patch)

    if (!canEditContent || !activeTab) return

    const spaceId = space && space.spaceId
    if (spaceId !== this.loadedSpaceId) {
      // 切换空间：丢弃旧空间的列表与草稿，重新加载当前栏目与审核状态。
      this.loadedSpaceId = spaceId
      this.loadedTabs = {}
      this.draftDirty = false
      // 让旧空间在途的审核状态响应失效，避免覆盖新空间。
      this.reviewRequestSeq += 1
      this.setData({
        draftDirty: false,
        feedback: null,
        review: null,
        reviewError: '',
        reviewExpanded: false,
        reviewSummary: '',
        reviewNeedsAttention: false,
        homeSyncError: '',
      })
      this.loadReview()
      this.loadTab(activeTab)
      return
    }
    if (!this.loadedTabs[activeTab]) this.loadTab(activeTab)
  },

  loadTab(tab) {
    if (this.pageDisposed) return
    const key = String(tab || '')
    if (!key || this.loadedTabs[key]) return
    this.loadedTabs[key] = true
    if (key === 'home') {
      this.loadHome()
    } else if (key === 'story') {
      this.loadStory()
    } else if (key === 'photo') {
      this.loadPhoto()
    } else if (key === 'anniversary') {
      this.loadAnniversary()
    } else if (key === 'message') {
      this.loadMessages(1)
    }
  },

  onSwitchTab(event) {
    const key = String(event.currentTarget.dataset.key || '')
    if (!key || key === this.data.activeTab) return
    if (!rules.isContentTabAllowed(key, this.data.tabs)) return
    if (this.draftDirty) {
      wx.showModal({
        title: '放弃未保存的修改？',
        content: '切换栏目会丢失当前未保存的修改。',
        confirmText: '放弃并切换',
        cancelText: '继续编辑',
        confirmColor: '#b85060',
        success: (result) => {
          if (result && result.confirm) this.activateTab(key)
        },
      })
      return
    }
    this.activateTab(key)
  },

  activateTab(key) {
    if (this.pageDisposed) return
    const hadDraft = this.draftDirty
    const wasHome = this.data.activeTab === 'home'
    this.draftDirty = false
    const patch = {
      activeTab: key,
      draftDirty: false,
      feedback: null,
      swipeKey: '',
      replyTargetId: '',
      replyDraft: '',
      replyDraftLength: 0,
    }
    if (hadDraft && (key === 'home' || wasHome) && this.homeBaselineForm) {
      // 用户确认放弃草稿后，首页内联表单恢复到最近一次服务端确认的内容。
      patch.homeForm = { ...this.homeBaselineForm }
      patch.homeError = ''
    }
    this.setData(patch)
    this.loadTab(key)
  },

  onNavBack() {
    if (this.navConfirming) return
    const depth = readPageDepth()
    const leave = () => {
      if (this.pageDisposed) return
      if (depth > 1) {
        wx.navigateBack({ delta: 1, fail: () => wx.reLaunch({ url: PROFILE_ROUTE }) })
        return
      }
      wx.reLaunch({ url: PROFILE_ROUTE })
    }
    if (!this.draftDirty) {
      leave()
      return
    }
    this.navConfirming = true
    wx.showModal({
      title: '放弃未保存的修改？',
      content: '返回后当前未保存的修改不会保留。',
      confirmText: '放弃并返回',
      cancelText: '继续编辑',
      confirmColor: '#b85060',
      success: (result) => {
        this.navConfirming = false
        if (result && result.confirm) leave()
      },
      fail: () => { this.navConfirming = false },
    })
  },

  markDirty() {
    this.draftDirty = true
    if (!this.data.draftDirty) this.setData({ draftDirty: true })
  },

  clearDraft() {
    this.draftDirty = false
    if (this.data.draftDirty) this.setData({ draftDirty: false })
  },

  showFeedback(kind, message) {
    if (!message) return
    this.setData({ feedback: { kind, message, id: Date.now() } })
  },

  onCloseFeedback() {
    this.setData({ feedback: null })
  },

  /** 统一错误提示：冲突类错误强制刷新空间状态。 */
  handleContentError(error, fallback) {
    const message = rules.buildContentErrorMessage(error, fallback)
    if (rules.isContentConflict(error)) {
      sessionState.refreshAfterSpaceChange('space-studio:content-conflict')
        .then(snapshot => this.applySession(snapshot))
        .catch(() => undefined)
    }
    return message
  },

  /* ===================== 公开审核 ===================== */

  async loadReview() {
    const requestId = ++this.reviewRequestSeq
    this.setData({ reviewLoading: true, reviewError: '' })
    try {
      const review = await api.fetchSpaceReviewStatus()
      if (this.pageDisposed || requestId !== this.reviewRequestSeq) return
      const summary = rules.describeReview(review)
      this.setData({
        reviewLoading: false,
        review,
        reviewSummary: summary.summary,
        reviewNeedsAttention: summary.needsAttention,
      })
    } catch (error) {
      if (this.pageDisposed || requestId !== this.reviewRequestSeq) return
      this.setData({
        reviewLoading: false,
        reviewError: this.handleContentError(error, '公开审核状态加载失败，请稍后重试'),
      })
    }
  },

  onRetryReview() {
    this.loadReview()
  },

  /** 审核摘要展开 / 收起：详细原因按需查看，待审核与驳回状态始终在摘要中可见。 */
  onToggleReview() {
    this.setData({ reviewExpanded: !this.data.reviewExpanded })
  },

  async onResubmitReview() {
    if (this.data.resubmitting) return
    if (!this.data.review || this.data.review.canResubmit !== true) return
    // 使旧的审核状态查询失效，避免它在新结果之后覆盖界面。
    this.reviewRequestSeq += 1
    this.setData({ resubmitting: true, reviewLoading: false, reviewError: '' })
    try {
      const review = await api.resubmitSpaceReview()
      if (this.pageDisposed) return
      const summary = rules.describeReview(review)
      this.setData({
        resubmitting: false,
        review,
        reviewSummary: summary.summary,
        reviewNeedsAttention: summary.needsAttention,
      })
      const message = (review && (review.reviewMessage || review.message))
        || '已重新提交公开审核'
      this.showFeedback(review && review.changed === false ? 'stale' : 'success', message)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        resubmitting: false,
        reviewError: this.handleContentError(error, '重新提交审核失败，请稍后重试'),
      })
    }
  },

  /* ===================== 通用表单输入 ===================== */

  onFormInput(event) {
    const dataset = event.currentTarget.dataset || {}
    const form = String(dataset.form || '')
    const field = String(dataset.field || '')
    if (!form || !field) return
    this.setData({ [`${form}.${field}`]: event.detail.value })
    this.markDirty()
  },

  onFormSwitch(event) {
    const dataset = event.currentTarget.dataset || {}
    const form = String(dataset.form || '')
    const field = String(dataset.field || '')
    if (!form || !field) return
    this.setData({ [`${form}.${field}`]: Boolean(event.detail.value) })
    this.markDirty()
  },

  onFormDateTimeChange(event) {
    const dataset = event.currentTarget.dataset || {}
    const form = String(dataset.form || '')
    const field = String(dataset.field || '')
    if (!form || !field) return
    this.setData({ [`${form}.${field}`]: event.detail.value })
    this.markDirty()
  },

  onClearFormDateTime(event) {
    const dataset = event.currentTarget.dataset || {}
    const form = String(dataset.form || '')
    const dateField = String(dataset.dateField || '')
    const timeField = String(dataset.timeField || '')
    if (!form || !dateField || !timeField) return
    this.setData({ [`${form}.${dateField}`]: '', [`${form}.${timeField}`]: '' })
    this.markDirty()
  },

  /** 选择并按现有 /space/media/upload 上传图片，成功后写入真实 URL。 */
  onChooseImage(event) {
    const dataset = event.currentTarget.dataset || {}
    const form = String(dataset.form || '')
    const field = String(dataset.field || '')
    if (!form || !field) return
    const uploadingKey = dataset.uploading || ''
    // 同一字段上传期间不再重复唤起选择 / 上传，避免写入旧地址或重复提交。
    if (uploadingKey && this.data[uploadingKey]) return
    const handleFile = async (filePath) => {
      if (!filePath) return
      if (uploadingKey) this.setData({ [uploadingKey]: true })
      try {
        const url = await api.uploadSpaceImage(filePath)
        if (this.pageDisposed) return
        this.setData({ [`${form}.${field}`]: url })
        this.markDirty()
        wx.showToast({ title: '图片已上传', icon: 'success' })
      } catch (error) {
        if (this.pageDisposed) return
        wx.showToast({
          title: this.handleContentError(error, '图片上传失败，请稍后重试'),
          icon: 'none',
          duration: 2400,
        })
      } finally {
        if (uploadingKey && !this.pageDisposed) this.setData({ [uploadingKey]: false })
      }
    }

    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (result) => {
          const file = result && result.tempFiles && result.tempFiles[0]
          handleFile(file && file.tempFilePath)
        },
      })
      return
    }
    if (typeof wx.chooseImage === 'function') {
      wx.chooseImage({
        count: 1,
        success: (result) => {
          const list = result && result.tempFilePaths
          handleFile(Array.isArray(list) ? list[0] : '')
        },
      })
      return
    }
    wx.showToast({ title: '当前环境不支持选择图片', icon: 'none' })
  },

  onClearImage(event) {
    const dataset = event.currentTarget.dataset || {}
    const form = String(dataset.form || '')
    const field = String(dataset.field || '')
    if (!form || !field) return
    this.setData({ [`${form}.${field}`]: '' })
    this.markDirty()
  },

  /* ===================== 首页 ===================== */

  async loadHome() {
    this.setData({ homeLoading: true, homeError: '' })
    try {
      const home = await api.querySpaceHome()
      if (this.pageDisposed) return
      this.homeBaselineLoveStartTime = home && typeof home.loveStartTime === 'string'
        ? home.loveStartTime
        : ''
      const form = rules.buildHomeForm(home)
      this.homeBaselineForm = { ...form }
      this.setData({
        homeLoading: false,
        homeLoaded: true,
        homeForm: form,
      })
      this.clearDraft()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        homeLoading: false,
        homeError: this.handleContentError(error, '空间首页加载失败，请稍后重试'),
      })
    }
  },

  onRetryHome() {
    if (!this.draftDirty) {
      this.loadHome()
      return
    }
    confirmModal('放弃未保存的修改？', '重新加载会恢复为上次保存的首页内容。', '重新加载').then((confirmed) => {
      if (confirmed) this.loadHome()
    })
  },

  onResetHome() {
    const run = () => this.loadHome()
    if (!this.draftDirty) {
      run()
      return
    }
    confirmModal('重置首页内容？', '重置会恢复到上次保存的内容。', '重置').then((confirmed) => {
      if (confirmed) run()
    })
  },

  async onSaveHome() {
    if (!this.data.canEditContent || this.data.homeSaving) return
    // 上传期间保存会把旧地址写回服务端，这里直接阻止并提示等待。
    if (this.data.homeUploadingField) {
      this.setData({ homeError: '图片正在上传，请等上传完成后再保存' })
      return
    }
    const validationError = rules.validateHomeForm(this.data.homeForm)
    if (validationError) {
      this.setData({ homeError: validationError })
      return
    }
    this.setData({ homeSaving: true, homeError: '', homeSyncError: '' })
    try {
      const result = await api.saveSpaceHome(
        rules.buildHomePayload(this.data.homeForm, this.homeBaselineLoveStartTime),
      )
      if (this.pageDisposed) return
      this.homeBaselineLoveStartTime = result && typeof result.loveStartTime === 'string'
        ? result.loveStartTime
        : ''
      const nextForm = rules.buildHomeForm(result)
      this.homeBaselineForm = { ...nextForm }
      this.setData({
        homeSaving: false,
        homeForm: nextForm,
      })
      this.clearDraft()
      const feedback = rules.describeSaveReview(result, '空间首页已保存')
      this.showFeedback(feedback.kind, feedback.message)
      this.loadReview()
      // 空间名称 / 简介变化会影响全局空间上下文：刷新失败单独提示，不误报保存失败。
      this.syncHomeStateAfterSave()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        homeSaving: false,
        homeError: this.handleContentError(error, '空间首页保存失败，请稍后重试'),
      })
    }
  },

  /**
   * 首页保存成功后的全局状态同步。
   *
   * 与保存写请求严格分开：失败只提示「已保存，状态同步失败」并提供重试，
   * 绝不把已成功的保存说成失败，也不要求用户重新提交 /space/home/save。
   */
  async syncHomeStateAfterSave() {
    if (this.data.homeSyncing) return
    this.setData({ homeSyncing: true })
    try {
      const snapshot = await sessionState.refreshAfterSpaceChange('space-studio:home-saved')
      if (this.pageDisposed) return
      if (!snapshot || snapshot.status === SESSION_STATUS.ERROR) {
        this.setData({ homeSyncing: false, homeSyncError: '已保存，状态同步失败' })
        return
      }
      this.setData({ homeSyncing: false, homeSyncError: '' })
      this.applySession(snapshot)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ homeSyncing: false, homeSyncError: '已保存，状态同步失败' })
    }
  },

  /** 只重试状态同步，不重新提交首页保存。 */
  async onRetryHomeSync() {
    if (this.data.homeSyncing) return
    this.setData({ homeSyncError: '', homeSyncing: true })
    try {
      const snapshot = await sessionState.refreshAfterSpaceChange('space-studio:home-sync-retry')
      if (this.pageDisposed) return
      if (!snapshot || snapshot.status === SESSION_STATUS.ERROR) {
        this.setData({ homeSyncing: false, homeSyncError: '已保存，状态同步失败' })
        return
      }
      this.setData({ homeSyncing: false })
      wx.showToast({ title: '状态已同步', icon: 'success', duration: 1200 })
      this.applySession(snapshot)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ homeSyncing: false, homeSyncError: '已保存，状态同步失败' })
    }
  },

  /* ===================== 故事 ===================== */

  async loadStory() {
    this.setData({ storyLoading: true, storyError: '' })
    try {
      const [chapters, nodes] = await Promise.all([
        api.fetchStoryChapters(),
        api.fetchStoryNodes(),
      ])
      if (this.pageDisposed) return
      const decoratedChapters = chapters.map(chapter => ({
        ...chapter,
        nodeCount: Number(chapter.nodeCount) || 0,
        statusText: chapter.isVisible === false ? '隐藏' : '展示中',
      }))
      const decoratedNodes = nodes.map(node => ({
        ...node,
        happenedText: formatDateTime(node.happenedTime, node.showTime),
        visibilityText: rules.visibilityLabel(node.visibility),
        reviewText: rules.reviewStatusLabel(node.reviewStatus),
        milestoneText: node.isMilestone === true ? '里程碑' : '',
      }))
      const chapterOptions = [{ id: 0, name: '全部章节' }].concat(
        decoratedChapters.map(chapter => ({ id: chapter.id, name: chapter.name || '未命名章节' })),
      )
      const existingIndex = chapterOptions.findIndex(
        option => Number(option.id) === Number(this.data.chapterFilterId),
      )
      const filterIndex = existingIndex >= 0 ? existingIndex : 0
      this.setData({
        storyLoading: false,
        chapters: decoratedChapters,
        nodes: decoratedNodes,
        chapterOptions,
        chapterFilterIndex: filterIndex,
      })
      this.applyChapterFilter(filterIndex)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        storyLoading: false,
        storyError: this.handleContentError(error, '故事内容加载失败，请稍后重试'),
      })
    }
  },

  onRetryStory() {
    this.loadStory()
  },

  applyChapterFilter(index) {
    const options = this.data.chapterOptions || []
    const safeIndex = Math.min(Math.max(0, Number(index) || 0), Math.max(0, options.length - 1))
    const option = options[safeIndex] || { id: 0 }
    const filterId = Number(option.id) || 0
    const visibleNodes = filterId
      ? (this.data.nodes || []).filter(node => Number(node.chapterId) === filterId)
      : (this.data.nodes || []).slice()
    this.setData({
      chapterFilterIndex: safeIndex,
      chapterFilterId: filterId,
      visibleNodes,
    })
  },

  onChapterFilterChange(event) {
    this.applyChapterFilter(Number(event.detail.value) || 0)
  },

  openEditor(kind, extra) {
    if (!kind || this.data.sortSaving || this.data.deleting) return
    const parts = [`kind=${encodeURIComponent(kind)}`]
    if (extra && extra.id) parts.push(`id=${encodeURIComponent(extra.id)}`)
    if (extra && extra.chapterId) {
      parts.push(`chapterId=${encodeURIComponent(extra.chapterId)}`)
    }
    if (extra && extra.categoryId) {
      parts.push(`categoryId=${encodeURIComponent(extra.categoryId)}`)
    }
    this.editorOpen = true
    wx.navigateTo({
      url: `${SPACE_CONTENT_EDITOR_ROUTE}?${parts.join('&')}`,
      fail: () => { this.editorOpen = false },
    })
  },

  onNewChapter() {
    this.openEditor('chapter')
  },

  onNewNode() {
    if (!(this.data.chapters || []).length) {
      wx.showToast({ title: '请先创建章节', icon: 'none', duration: 2200 })
      return
    }
    this.openEditor('story', { chapterId: this.data.chapterFilterId })
  },

  onNewCategory() {
    this.openEditor('category')
  },

  onNewPhoto() {
    if (!(this.data.photoCategories || []).length) {
      wx.showToast({ title: '请先创建一个相册分类', icon: 'none', duration: 2200 })
      return
    }
    this.openEditor('photo', { categoryId: this.data.photoFilterId })
  },

  onNewAnniversary() {
    this.openEditor('anniversary')
  },

  onOpenItem(event) {
    if (this.data.dragging || this.data.sortSaving || this.data.deleting) return
    if (Date.now() < this.suppressTapUntil) return
    if (this.data.swipeKey) {
      this.setData({ swipeKey: '' })
      return
    }
    const dataset = event.currentTarget.dataset || {}
    const kind = String(dataset.kind || '')
    const id = Number(dataset.id)
    if (!kind || !id) return
    this.openEditor(kind, { id })
  },

  onRowTouchStart(event) {
    if (this.data.dragging || this.data.sortSaving) return
    const touch = firstTouch(event)
    if (!touch) return
    this.touchStartX = Number(touch.clientX) || 0
    this.touchStartY = Number(touch.clientY) || 0
    this.touchAxis = ''
  },

  onRowTouchMove(event) {
    if (this.data.dragging || this.data.sortSaving) return
    const touch = firstTouch(event)
    if (!touch) return
    const deltaX = (Number(touch.clientX) || 0) - this.touchStartX
    const deltaY = (Number(touch.clientY) || 0) - this.touchStartY
    if (!this.touchAxis) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return
      this.touchAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
    }
    if (this.touchAxis !== 'x') return
    this.suppressTapUntil = Date.now() + 300
    const dataset = event.currentTarget.dataset || {}
    const kind = String(dataset.kind || '')
    const id = Number(dataset.id)
    if (!kind || !id) return
    const key = `${kind}:${id}`
    if (deltaX < -48) {
      if (this.data.swipeKey !== key) this.setData({ swipeKey: key })
    } else if (deltaX > 24 && this.data.swipeKey === key) {
      this.setData({ swipeKey: '' })
    }
  },

  onRowTouchEnd() {
    if (this.touchAxis === 'x') this.suppressTapUntil = Date.now() + 300
    this.touchAxis = ''
  },

  onDragHandleTap() {},

  getDragList(kind) {
    const lists = {
      chapter: this.data.chapters,
      story: this.data.visibleNodes,
      category: this.data.photoCategories,
      photo: this.data.photos,
      anniversary: this.data.anniversaries,
    }
    const list = lists[kind]
    return Array.isArray(list) ? list.slice() : []
  },

  setDragList(kind, list, toIndex) {
    const keys = {
      chapter: 'chapters',
      story: 'visibleNodes',
      category: 'photoCategories',
      photo: 'photos',
      anniversary: 'anniversaries',
    }
    const key = keys[kind]
    if (!key) return
    this.setData({ [key]: list, dragToIndex: toIndex })
  },

  measureDragRects(kind) {
    if (!kind) return
    if (typeof wx === 'undefined' || typeof wx.createSelectorQuery !== 'function') return
    try {
      const query = wx.createSelectorQuery().in(this)
      if (!query || typeof query.selectAll !== 'function' || typeof query.exec !== 'function') return
      const selector = query.selectAll(`.drag-item-${kind}`)
      if (!selector || typeof selector.boundingClientRect !== 'function') return
      selector.boundingClientRect((rects) => {
        if (!this.data.dragging || !Array.isArray(rects)) return
        this.dragRects = rects
        if (rects[0] && Number(rects[0].height) > 0) {
          this.dragRowHeight = Number(rects[0].height)
        }
      })
      query.exec()
    } catch (error) {
      this.dragRects = []
    }
  },

  resolveDragTarget(clientY) {
    const from = Number(this.data.dragFromIndex)
    const list = this.data.dragListSnapshot || []
    if (!Number.isInteger(from) || !list.length) return from
    const max = list.length - 1
    const y = Number(clientY)
    if (!Number.isFinite(y)) return Math.min(Math.max(0, from), max)
    const rects = this.dragRects || []
    if (rects.length === list.length) {
      let target = 0
      let nearest = Number.POSITIVE_INFINITY
      rects.forEach((rect, index) => {
        const center = (Number(rect.top) + Number(rect.bottom)) / 2
        const distance = Math.abs(center - y)
        if (distance < nearest) {
          nearest = distance
          target = index
        }
      })
      return target
    }
    const rowHeight = Math.max(32, Number(this.dragRowHeight) || 88)
    const delta = Math.round((y - this.dragStartY) / rowHeight)
    return Math.min(max, Math.max(0, from + delta))
  },

  onDragStart(event) {
    if (this.data.sortSaving || this.data.deleting) return
    const dataset = event.currentTarget.dataset || {}
    const kind = String(dataset.kind || '')
    const index = Number(dataset.index)
    const list = this.getDragList(kind)
    const item = list[index]
    if (!item || !item.id) return
    const touch = firstTouch(event)
    this.dragStartY = touch ? (Number(touch.clientY) || 0) : 0
    this.dragRects = []
    this.suppressTapUntil = Date.now() + 600
    const patch = {
      dragging: true,
      dragKind: kind,
      dragItemId: Number(item.id) || 0,
      dragFromIndex: index,
      dragToIndex: index,
      dragListSnapshot: list,
      swipeKey: '',
    }
    if (kind === 'chapter' || kind === 'story') patch.storyError = ''
    else if (kind === 'category' || kind === 'photo') patch.photoError = ''
    else if (kind === 'anniversary') patch.anniversaryError = ''
    this.setData(patch)
    this.measureDragRects(kind)
  },

  onDragMove(event) {
    if (!this.data.dragging) return
    const touch = firstTouch(event)
    if (!touch) return
    const target = this.resolveDragTarget(touch.clientY)
    if (target === Number(this.data.dragToIndex)) return
    const snapshot = this.data.dragListSnapshot || []
    const next = reorderList(snapshot, this.data.dragFromIndex, target)
    this.setDragList(this.data.dragKind, next, target)
  },

  async onDragEnd(event) {
    if (!this.data.dragging) return
    const kind = this.data.dragKind
    const from = Number(this.data.dragFromIndex)
    const snapshot = this.data.dragListSnapshot || []
    const touch = firstTouch(event)
    const to = touch ? this.resolveDragTarget(touch.clientY) : Number(this.data.dragToIndex)
    const next = reorderList(snapshot, from, to)
    const keys = {
      chapter: 'chapters',
      story: 'visibleNodes',
      category: 'photoCategories',
      photo: 'photos',
      anniversary: 'anniversaries',
    }
    const listKey = keys[kind]
    const patch = {
      dragging: false,
      dragKind: '',
      dragItemId: 0,
      dragFromIndex: -1,
      dragToIndex: -1,
      dragListSnapshot: null,
    }
    if (listKey) patch[listKey] = next
    this.setData(patch)
    this.dragRects = []
    this.dragRowHeight = 88
    this.suppressTapUntil = Date.now() + 350
    if (!listKey || from === to || !snapshot.length) return
    await this.commitSort(kind, snapshot, next)
  },

  async commitSort(kind, snapshot, nextList) {
    if (this.data.sortSaving) return
    const errorKeys = {
      chapter: 'storyError',
      story: 'storyError',
      category: 'photoError',
      photo: 'photoError',
      anniversary: 'anniversaryError',
    }
    const errorKey = errorKeys[kind]
    if (!errorKey) return
    this.setData({ sortSaving: true, [errorKey]: '' })
    try {
      if (kind === 'chapter') {
        await api.saveStoryChapterOrder(rules.buildOrderItems(nextList))
      } else if (kind === 'story') {
        const chapterId = Number(this.data.chapterFilterId) || 0
        const items = rules.buildOrderItems(nextList)
        if (chapterId) await api.saveStoryNodeOrder(chapterId, items)
        else await api.saveStoryNodeGlobalOrder(items)
      } else if (kind === 'category') {
        await api.savePhotoCategoryOrder(rules.buildOrderItems(nextList))
      } else if (kind === 'anniversary') {
        await api.saveAnniversaryOrder(rules.buildOrderItems(nextList))
      } else if (kind === 'photo') {
        const categoryId = Number(this.data.photoFilterId) || 0
        const sortList = await api.fetchPhotoSortList(categoryId)
        const fullList = Array.isArray(sortList) ? sortList.slice() : []
        const positions = snapshot.map((item) => {
          return fullList.findIndex(record => Number(record.id) === Number(item.id))
        })
        if (positions.some(index => index < 0)) {
          throw new Error('照片排序列表已变化，请重试')
        }
        const nextIds = nextList.map(item => item.id)
        positions.forEach((position, index) => {
          fullList[position] = { ...fullList[position], id: nextIds[index] }
        })
        const items = rules.buildOrderItems(fullList)
        if (categoryId) await api.savePhotoOrder(categoryId, items)
        else await api.savePhotoGlobalOrder(items)
      }
      if (this.pageDisposed) return
      this.setData({ sortSaving: false })
    } catch (error) {
      if (this.pageDisposed) return
      this.setDragList(kind, snapshot, -1)
      this.setData({
        sortSaving: false,
        [errorKey]: this.handleContentError(error, '排序保存失败，请稍后重试'),
      })
    }
  },

  async onDeleteItem(event) {
    if (this.data.deleting) return
    const dataset = event.currentTarget.dataset || {}
    const kind = String(dataset.kind || '')
    const id = Number(dataset.id)
    if (!kind || !id) return
    const copies = {
      chapter: {
        title: '删除章节？', content: '章节下仍有故事时无法删除。删除后不可恢复。', toast: '章节已删除',
      },
      story: {
        title: '删除故事？', content: '删除后该故事不再展示，且无法恢复。', toast: '故事已删除',
      },
      category: {
        title: '删除分类？', content: '分类下仍有照片时无法删除。删除后不可恢复。', toast: '分类已删除',
      },
      photo: {
        title: '删除照片？', content: '删除后照片不再展示，且无法恢复。', toast: '照片已删除',
      },
      anniversary: {
        title: '删除纪念日？', content: '删除后不再展示，且无法恢复。', toast: '纪念日已删除',
      },
    }
    const copy = copies[kind]
    if (!copy) return
    const confirmed = await confirmModal(copy.title, copy.content, '删除')
    if (!confirmed || this.pageDisposed) return
    const errorKeys = {
      chapter: 'storyError',
      story: 'storyError',
      category: 'photoError',
      photo: 'photoError',
      anniversary: 'anniversaryError',
    }
    const errorKey = errorKeys[kind]
    this.setData({ deleting: true, swipeKey: '', [errorKey]: '' })
    try {
      if (kind === 'chapter') await api.deleteStoryChapter(id)
      else if (kind === 'story') await api.deleteStoryNode(id)
      else if (kind === 'category') await api.deletePhotoCategory(id)
      else if (kind === 'photo') await api.deletePhoto(id)
      else await api.deleteAnniversary(id)
      if (this.pageDisposed) return
      this.setData({ deleting: false })
      wx.showToast({ title: copy.toast, icon: 'success' })
      if (kind === 'chapter' || kind === 'story') await this.loadStory()
      else if (kind === 'category' || kind === 'photo') await this.loadPhoto()
      else await this.loadAnniversary()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        deleting: false,
        [errorKey]: this.handleContentError(error, '删除失败，请稍后重试'),
      })
    }
  },

  /* ===================== 相册 ===================== */

  async loadPhoto() {
    this.setData({ photoLoading: true, photoError: '' })
    try {
      await this.loadPhotoCategories()
      if (this.pageDisposed) return
      await this.loadPhotoPage(this.data.photoCurrent || 1)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        photoLoading: false,
        photoError: this.handleContentError(error, '相册加载失败，请稍后重试'),
      })
    }
  },

  async loadPhotoCategories() {
    const categories = await api.fetchPhotoCategories()
    if (this.pageDisposed) return
    const filterOptions = [{ id: 0, categoryName: '全部分类' }].concat(categories.map(category => ({
      id: category.id,
      categoryName: category.categoryName || '未命名分类',
    })))
    const existingIndex = filterOptions.findIndex(
      option => Number(option.id) === Number(this.data.photoFilterId),
    )
    const filterIndex = existingIndex >= 0 ? existingIndex : 0
    const filterOption = filterOptions[filterIndex] || filterOptions[0]
    this.setData({
      photoCategories: categories,
      photoFilterOptions: filterOptions,
      photoFilterIndex: filterIndex,
      photoFilterId: Number(filterOption.id) || 0,
    })
  },

  async loadPhotoPage(page) {
    const current = Math.max(1, Number(page) || 1)
    const categoryId = Number(this.data.photoFilterId) || 0
    const requestId = ++this.photoPageSeq
    const result = (await api.fetchPhotoManagePage(current, PHOTO_PAGE_SIZE, categoryId)) || {}
    if (this.pageDisposed || requestId !== this.photoPageSeq) return
    const records = Array.isArray(result.records) ? result.records : []
    const total = Number(result.total) || 0
    const totalPages = Math.max(1, Math.ceil(total / PHOTO_PAGE_SIZE))
    const resolvedCurrent = Math.max(1, Number(result.current) || current)
    if (total > 0 && resolvedCurrent > totalPages) {
      await this.loadPhotoPage(totalPages)
      return
    }
    this.setData({
      photoLoading: false,
      photos: records.map(photo => ({
        ...photo,
        takenText: formatDateTime(photo.takenTime, photo.showTime),
        visibilityText: rules.visibilityLabel(photo.visibility),
        reviewText: rules.reviewStatusLabel(photo.reviewStatus),
        coverText: photo.isCover === true ? '封面' : '',
      })),
      photoCurrent: resolvedCurrent,
      photoTotal: total,
      photoTotalPages: totalPages,
    })
  },

  onRetryPhoto() {
    this.loadPhoto()
  },

  onPhotoFilterChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.photoFilterOptions[index] || { id: 0 }
    this.setData({ photoFilterIndex: index, photoFilterId: Number(option.id) || 0 })
    this.setData({ photoLoading: true, photoError: '' })
    this.loadPhotoPage(1).catch((error) => {
      if (this.pageDisposed) return
      this.setData({
        photoLoading: false,
        photoError: this.handleContentError(error, '相册加载失败，请稍后重试'),
      })
    })
  },

  onPhotoPage(event) {
    if (this.data.photoLoading) return
    const direction = String(event.currentTarget.dataset.direction || '')
    const totalPages = Math.max(1, Math.ceil((this.data.photoTotal || 0) / PHOTO_PAGE_SIZE))
    const next = direction === 'prev' ? this.data.photoCurrent - 1 : this.data.photoCurrent + 1
    if (next < 1 || next > totalPages) return
    this.setData({ photoLoading: true, photoError: '' })
    this.loadPhotoPage(next).catch((error) => {
      if (this.pageDisposed) return
      this.setData({
        photoLoading: false,
        photoError: this.handleContentError(error, '相册加载失败，请稍后重试'),
      })
    })
  },

  /* ===================== 纪念日 ===================== */

  async loadAnniversary() {
    this.setData({ anniversaryLoading: true, anniversaryError: '' })
    try {
      const list = await api.fetchAnniversaries()
      if (this.pageDisposed) return
      this.setData({
        anniversaryLoading: false,
        anniversaries: list.map(item => ({
          ...item,
          dateText: rules.formatContentDate(item.anniversaryDate),
          repeatText: Number(item.repeatType) === 0 ? '仅此一次' : '每年重复',
          categoryText: rules.anniversaryCategoryLabel(item.category),
          visibilityText: rules.visibilityLabel(item.visibility),
          reviewText: rules.reviewStatusLabel(item.reviewStatus),
        })),
      })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        anniversaryLoading: false,
        anniversaryError: this.handleContentError(error, '纪念日加载失败，请稍后重试'),
      })
    }
  },

  onRetryAnniversary() {
    this.loadAnniversary()
  },

  /* ===================== 留言 ===================== */

  async loadMessages(page) {
    const current = Math.max(1, Number(page) || 1)
    const requestId = ++this.messagePageSeq
    this.setData({ messageLoading: true, messageError: '' })
    try {
      const result = (await api.fetchMessagePage(current, MESSAGE_PAGE_SIZE)) || {}
      if (this.pageDisposed || requestId !== this.messagePageSeq) return
      const records = Array.isArray(result.records) ? result.records : []
      const total = Number(result.total) || 0
      const totalPages = Math.max(1, Math.ceil(total / MESSAGE_PAGE_SIZE))
      const resolvedCurrent = Math.max(1, Number(result.current) || current)
      if (total > 0 && resolvedCurrent > totalPages) {
        await this.loadMessages(totalPages)
        return
      }
      this.setData({
        messageLoading: false,
        messageCurrent: resolvedCurrent,
        messageTotal: total,
        messageTotalPages: totalPages,
        messages: records.map(message => ({
          ...message,
          initials: initials(message.userName),
          displayTime: formatDateTime(message.createTime) || '时间未记录',
          replies: (Array.isArray(message.replies) ? message.replies : []).map(reply => ({
            ...reply,
            initials: initials(reply.fromUserName),
            displayTime: formatDateTime(reply.createTime) || '时间未记录',
          })),
        })),
      })
    } catch (error) {
      if (this.pageDisposed || requestId !== this.messagePageSeq) return
      this.setData({
        messageLoading: false,
        messageError: this.handleContentError(error, '留言加载失败，请稍后重试'),
      })
    }
  },

  onRetryMessage() {
    this.loadMessages(this.data.messageCurrent)
  },

  onMessagePage(event) {
    if (this.data.messageLoading) return
    const direction = String(event.currentTarget.dataset.direction || '')
    const totalPages = Math.max(1, Math.ceil((this.data.messageTotal || 0) / MESSAGE_PAGE_SIZE))
    const next = direction === 'prev' ? this.data.messageCurrent - 1 : this.data.messageCurrent + 1
    if (next < 1 || next > totalPages) return
    this.loadMessages(next)
  },

  onMessageDraftInput(event) {
    const value = String(event.detail.value || '')
    this.setData({ messageDraft: value, messageDraftLength: value.length })
  },

  async onPublishMessage() {
    if (this.data.publishing) return
    const validationError = rules.validateMessageContent(this.data.messageDraft)
    if (validationError) {
      this.setData({ messageActionError: validationError })
      return
    }
    this.setData({ publishing: true, messageActionError: '' })
    try {
      await api.publishMessage(this.data.messageDraft.trim())
      if (this.pageDisposed) return
      this.setData({
        publishing: false,
        messageDraft: '',
        messageDraftLength: 0,
      })
      this.clearDraft()
      wx.showToast({ title: '留言已发布', icon: 'success' })
      await this.loadMessages(1)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        publishing: false,
        messageActionError: this.handleContentError(error, '留言发布失败，请稍后重试'),
      })
    }
  },

  onReplyTap(event) {
    const messageId = String(event.currentTarget.dataset.id || '')
    if (!messageId) return
    this.setData({
      replyTargetId: messageId,
      replyDraft: '',
      replyDraftLength: 0,
      messageActionError: '',
    })
  },

  onReplyCancel() {
    this.setData({ replyTargetId: '', replyDraft: '', replyDraftLength: 0 })
  },

  onReplyInput(event) {
    const value = String(event.detail.value || '')
    this.setData({ replyDraft: value, replyDraftLength: value.length })
  },

  async onReplySubmit(event) {
    if (this.data.replying) return
    const messageId = String(event.currentTarget.dataset.id || this.data.replyTargetId || '')
    const content = String(this.data.replyDraft || '').trim()
    const validationError = rules.validateMessageContent(content)
    if (validationError) {
      this.setData({ messageActionError: validationError })
      return
    }
    if (!messageId) return
    this.setData({ replying: true, messageActionError: '' })
    try {
      await api.replyMessage({ messageId, content })
      if (this.pageDisposed) return
      this.setData({ replying: false, replyTargetId: '', replyDraft: '', replyDraftLength: 0 })
      wx.showToast({ title: '回复已发送', icon: 'success' })
      await this.loadMessages(this.data.messageCurrent)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        replying: false,
        messageActionError: this.handleContentError(error, '回复失败，请稍后重试'),
      })
    }
  },

  async onDeleteMessage(event) {
    const messageId = String(event.currentTarget.dataset.id || '')
    if (!messageId) return
    this.setData({ messageActionError: '' })
    const confirmed = await confirmModal('删除留言？', '删除后留言与回复都不再展示。', '删除')
    if (!confirmed || this.pageDisposed) return
    try {
      await api.deleteMessage(messageId)
      if (this.pageDisposed) return
      wx.showToast({ title: '留言已删除', icon: 'success' })
      await this.loadMessages(this.data.messageCurrent)
    } catch (error) {
      if (this.pageDisposed) return
      const message = this.handleContentError(error, '留言删除失败，请稍后重试')
      this.setData({ messageActionError: message })
      if (String((error && error.errorCode) || '') === '20006') {
        this.loadMessages(this.data.messageCurrent)
      }
    }
  },

  async onDeleteReply(event) {
    const replyId = String(event.currentTarget.dataset.id || '')
    if (!replyId) return
    this.setData({ messageActionError: '' })
    const confirmed = await confirmModal('删除回复？', '删除后回复不再展示。', '删除')
    if (!confirmed || this.pageDisposed) return
    try {
      await api.deleteMessageReply(replyId)
      if (this.pageDisposed) return
      wx.showToast({ title: '回复已删除', icon: 'success' })
      await this.loadMessages(this.data.messageCurrent)
    } catch (error) {
      if (this.pageDisposed) return
      const message = this.handleContentError(error, '回复删除失败，请稍后重试')
      this.setData({ messageActionError: message })
      if (String((error && error.errorCode) || '') === '20007') {
        this.loadMessages(this.data.messageCurrent)
      }
    }
  },
}, 'pages/space-studio/index'))
