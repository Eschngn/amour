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

const EMPTY_CHAPTER_FORM = { id: null, name: '', colorCode: '#D94F70', isVisible: true }
const EMPTY_NODE_FORM = {
  id: null,
  chapterId: 0,
  title: '',
  summary: '',
  content: '',
  happenedDate: '',
  happenedTime: '',
  location: '',
  coverImage: '',
  tagLabel: '',
  tagColor: '#D94F70',
  isMilestone: false,
  visibility: 0,
  baselineHappenedTime: '',
}
const EMPTY_CATEGORY_FORM = { id: null, categoryName: '', remark: '', isEnabled: true }
const EMPTY_PHOTO_FORM = {
  id: null,
  photoCategoryId: 0,
  title: '',
  description: '',
  url: '',
  takenDate: '',
  takenTime: '',
  location: '',
  isCover: false,
  visibility: 0,
  baselineTakenTime: '',
}
const EMPTY_ANNIVERSARY_FORM = {
  id: null,
  title: '',
  description: '',
  anniversaryDate: '',
  repeatType: 1,
  category: 'love',
  colorCode: '#D94F70',
  location: '',
  visibility: 0,
}

function splitDateTime(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return { date: '', time: '' }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(text)
  if (!match) return { date: '', time: '' }
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` }
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

function visibilityIndexOf(options, value) {
  const index = (Array.isArray(options) ? options : [])
    .findIndex(option => Number(option.value) === Number(value))
  return index < 0 ? 0 : index
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
    storySorting: false,
    chapters: [],
    nodes: [],
    visibleNodes: [],
    chapterOptions: [{ id: 0, name: '全部章节' }],
    chapterFilterIndex: 0,
    chapterFilterId: 0,
    chapterEditing: false,
    chapterSaving: false,
    chapterError: '',
    chapterForm: { ...EMPTY_CHAPTER_FORM },
    nodeEditing: false,
    nodeSaving: false,
    nodeError: '',
    nodeForm: { ...EMPTY_NODE_FORM },
    nodeChapterOptions: [],
    nodeChapterIndex: 0,
    nodeVisibilityIndex: 0,
    nodeCoverUploading: false,

    /* 相册 */
    photoLoading: true,
    photoError: '',
    photoSorting: false,
    photoCategories: [],
    photoFilterOptions: [{ id: 0, categoryName: '全部分类' }],
    photoFilterIndex: 0,
    photoFilterId: 0,
    photos: [],
    photoCurrent: 1,
    photoTotal: 0,
    photoTotalPages: 1,
    photoSize: PHOTO_PAGE_SIZE,
    categoryEditing: false,
    categorySaving: false,
    categoryError: '',
    categoryForm: { ...EMPTY_CATEGORY_FORM },
    photoEditing: false,
    photoSaving: false,
    photoFormError: '',
    photoForm: { ...EMPTY_PHOTO_FORM },
    photoCategoryOptions: [],
    photoCategoryIndex: 0,
    photoVisibilityIndex: 0,
    photoUploading: false,

    /* 纪念日 */
    anniversaryLoading: true,
    anniversaryError: '',
    anniversarySorting: false,
    anniversaries: [],
    anniversaryEditing: false,
    anniversarySaving: false,
    anniversaryFormError: '',
    anniversaryForm: { ...EMPTY_ANNIVERSARY_FORM },
    anniversaryCategoryOptions: rules.ANNIVERSARY_CATEGORIES,
    anniversaryCategoryIndex: 0,
    anniversaryVisibilityIndex: 0,
    repeatOptions: ['仅此一次', '每年重复'],

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
    this.bootstrap()
    this.unsubscribe = sessionState.subscribe(snapshot => this.applySession(snapshot))
  },

  onShow() {
    if (!this.pageReady) return
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
      chapterEditing: false,
      nodeEditing: false,
      categoryEditing: false,
      photoEditing: false,
      anniversaryEditing: false,
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

  onNewChapter() {
    this.setData({
      chapterEditing: true,
      chapterError: '',
      chapterForm: { ...EMPTY_CHAPTER_FORM },
    })
  },

  onEditChapter(event) {
    const index = Number(event.currentTarget.dataset.index)
    const chapter = (this.data.chapters || [])[index]
    if (!chapter) return
    this.setData({
      chapterEditing: true,
      chapterError: '',
      chapterForm: {
        id: chapter.id,
        name: chapter.name || '',
        colorCode: chapter.colorCode || '#D94F70',
        isVisible: chapter.isVisible !== false,
      },
    })
  },

  onCancelChapter() {
    const keepDirty = this.data.nodeEditing === true
    this.setData({ chapterEditing: false, chapterError: '', chapterForm: { ...EMPTY_CHAPTER_FORM } })
    if (!keepDirty) this.clearDraft()
  },

  async onSaveChapter() {
    if (this.data.chapterSaving) return
    const validationError = rules.validateChapterForm(this.data.chapterForm)
    if (validationError) {
      this.setData({ chapterError: validationError })
      return
    }
    this.setData({ chapterSaving: true, chapterError: '' })
    try {
      await api.saveStoryChapter(rules.buildChapterPayload(this.data.chapterForm))
      if (this.pageDisposed) return
      const keepDirty = this.data.nodeEditing === true
      this.setData({
        chapterSaving: false,
        chapterEditing: false,
        chapterForm: { ...EMPTY_CHAPTER_FORM },
      })
      if (keepDirty) this.markDirty()
      else this.clearDraft()
      wx.showToast({ title: '章节已保存', icon: 'success' })
      this.loadedTabs.story = true
      await this.loadStory()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        chapterSaving: false,
        chapterError: this.handleContentError(error, '章节保存失败，请稍后重试'),
      })
    }
  },

  async onDeleteChapter(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (!id) return
    const confirmed = await confirmModal('删除章节？', '章节下仍有故事时无法删除。', '删除')
    if (!confirmed || this.pageDisposed) return
    try {
      await api.deleteStoryChapter(id)
      if (this.pageDisposed) return
      if (Number(this.data.chapterForm.id) === id) {
        this.setData({ chapterEditing: false, chapterForm: { ...EMPTY_CHAPTER_FORM } })
      }
      if (this.data.nodeEditing && Number(this.data.nodeForm.chapterId) === id) {
        this.setData({ nodeEditing: false, nodeForm: { ...EMPTY_NODE_FORM } })
      }
      wx.showToast({ title: '章节已删除', icon: 'success' })
      await this.loadStory()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ storyError: this.handleContentError(error, '章节删除失败，请稍后重试') })
    }
  },

  async onMoveChapter(event) {
    if (this.data.storySorting) return
    const index = Number(event.currentTarget.dataset.index)
    const direction = String(event.currentTarget.dataset.direction || '')
    const result = rules.moveListItem(this.data.chapters, index, direction)
    if (!result.moved) return
    this.setData({ storySorting: true, storyError: '' })
    try {
      await api.saveStoryChapterOrder(rules.buildOrderItems(result.list))
      if (this.pageDisposed) return
      this.setData({ storySorting: false })
      await this.loadStory()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        storySorting: false,
        storyError: this.handleContentError(error, '章节排序失败，请稍后重试'),
      })
    }
  },

  onNewNode() {
    if (!this.data.chapters.length) {
      this.setData({ storyError: '请先创建章节，再添加故事' })
      return
    }
    const defaultChapterId = this.data.chapterFilterId || this.data.chapters[0].id
    const chapterOptions = this.data.chapters.map(chapter => ({
      id: chapter.id,
      name: chapter.name || '未命名章节',
    }))
    const index = Math.max(0, chapterOptions.findIndex(chapter => chapter.id === defaultChapterId))
    this.setData({
      nodeEditing: true,
      nodeError: '',
      nodeChapterOptions: chapterOptions,
      nodeChapterIndex: index,
      nodeVisibilityIndex: 0,
      nodeForm: {
        ...EMPTY_NODE_FORM,
        chapterId: defaultChapterId,
        visibility: 0,
      },
    })
  },

  onEditNode(event) {
    const index = Number(event.currentTarget.dataset.index)
    const node = (this.data.visibleNodes || [])[index]
    if (!node) return
    const chapterOptions = (this.data.chapters || []).map(chapter => ({
      id: chapter.id,
      name: chapter.name || '未命名章节',
    }))
    const chapterIndex = Math.max(0, chapterOptions.findIndex(chapter => chapter.id === node.chapterId))
    const time = splitDateTime(node.happenedTime)
    this.setData({
      nodeEditing: true,
      nodeError: '',
      nodeChapterOptions: chapterOptions,
      nodeChapterIndex: chapterIndex,
      nodeVisibilityIndex: visibilityIndexOf(this.data.visibilityOptions, node.visibility),
      nodeForm: {
        id: node.id,
        chapterId: node.chapterId,
        title: node.title || '',
        summary: node.summary || '',
        content: node.content || '',
        happenedDate: time.date,
        happenedTime: time.time,
        location: node.location || '',
        coverImage: node.coverImage || '',
        tagLabel: node.tagLabel || '',
        tagColor: node.tagColor || '#D94F70',
        isMilestone: node.isMilestone === true,
        visibility: Number(node.visibility) || 0,
        baselineHappenedTime: node.happenedTime || '',
      },
    })
  },

  onCancelNode() {
    const keepDirty = this.data.chapterEditing === true
    this.setData({ nodeEditing: false, nodeError: '', nodeForm: { ...EMPTY_NODE_FORM } })
    if (!keepDirty) this.clearDraft()
  },

  onNodeChapterChange(event) {
    const index = Number(event.detail.value) || 0
    const chapter = this.data.nodeChapterOptions[index]
    if (!chapter) return
    this.setData({ nodeChapterIndex: index, 'nodeForm.chapterId': chapter.id })
    this.markDirty()
  },

  onNodeVisibilityChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.visibilityOptions[index]
    if (!option) return
    const error = rules.validateVisibility(option.value, this.data.canPublish)
    if (error) {
      wx.showToast({ title: error, icon: 'none', duration: 2200 })
      return
    }
    this.setData({ nodeVisibilityIndex: index, 'nodeForm.visibility': option.value })
    this.markDirty()
  },

  async onSaveNode() {
    if (this.data.nodeSaving) return
    const form = { ...this.data.nodeForm, canPublish: this.data.canPublish }
    const validationError = rules.validateNodeForm(form)
    if (validationError) {
      this.setData({ nodeError: validationError })
      return
    }
    const visibilityError = rules.validateVisibility(form.visibility, this.data.canPublish)
    if (visibilityError) {
      this.setData({ nodeError: visibilityError })
      return
    }
    this.setData({ nodeSaving: true, nodeError: '' })
    try {
      const result = await api.saveStoryNode(rules.buildNodePayload(form))
      if (this.pageDisposed) return
      const keepDirty = this.data.chapterEditing === true
      this.setData({ nodeSaving: false, nodeEditing: false, nodeForm: { ...EMPTY_NODE_FORM } })
      if (keepDirty) this.markDirty()
      else this.clearDraft()
      const feedback = rules.describeSaveReview(result, '故事已保存')
      this.showFeedback(feedback.kind, feedback.message)
      if (result && result.reviewStatus) this.loadReview()
      await this.loadStory()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        nodeSaving: false,
        nodeError: this.handleContentError(error, '故事保存失败，请稍后重试'),
      })
    }
  },

  async onDeleteNode(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (!id) return
    const confirmed = await confirmModal('删除故事？', '删除后该故事不再展示，且无法恢复。', '删除')
    if (!confirmed || this.pageDisposed) return
    try {
      await api.deleteStoryNode(id)
      if (this.pageDisposed) return
      if (Number(this.data.nodeForm.id) === id) {
        this.setData({ nodeEditing: false, nodeForm: { ...EMPTY_NODE_FORM } })
      }
      wx.showToast({ title: '故事已删除', icon: 'success' })
      await this.loadStory()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ storyError: this.handleContentError(error, '故事删除失败，请稍后重试') })
      if (error && String(error.errorCode) === '20003') this.loadStory()
    }
  },

  async onMoveNode(event) {
    if (this.data.storySorting) return
    const index = Number(event.currentTarget.dataset.index)
    const direction = String(event.currentTarget.dataset.direction || '')
    const source = this.data.chapterFilterId
      ? this.data.visibleNodes
      : this.data.nodes
    const result = rules.moveListItem(source, index, direction)
    if (!result.moved) return
    const items = rules.buildOrderItems(result.list)
    this.setData({ storySorting: true, storyError: '' })
    try {
      if (this.data.chapterFilterId) {
        await api.saveStoryNodeOrder(this.data.chapterFilterId, items)
      } else {
        await api.saveStoryNodeGlobalOrder(items)
      }
      if (this.pageDisposed) return
      this.setData({ storySorting: false })
      await this.loadStory()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        storySorting: false,
        storyError: this.handleContentError(error, '故事排序失败，请稍后重试'),
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
    const formOptions = categories.map(category => ({
      id: category.id,
      categoryName: category.categoryName || '未命名分类',
    }))
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
      photoCategoryOptions: formOptions,
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

  onNewCategory() {
    this.setData({
      categoryEditing: true,
      categoryError: '',
      categoryForm: { ...EMPTY_CATEGORY_FORM },
    })
  },

  onEditCategory(event) {
    const index = Number(event.currentTarget.dataset.index)
    const category = (this.data.photoCategories || [])[index]
    if (!category) return
    this.setData({
      categoryEditing: true,
      categoryError: '',
      categoryForm: {
        id: category.id,
        categoryName: category.categoryName || '',
        remark: category.remark || '',
        isEnabled: category.isEnabled !== false,
      },
    })
  },

  onCancelCategory() {
    const keepDirty = this.data.photoEditing === true
    this.setData({ categoryEditing: false, categoryError: '', categoryForm: { ...EMPTY_CATEGORY_FORM } })
    if (!keepDirty) this.clearDraft()
  },

  async onSaveCategory() {
    if (this.data.categorySaving) return
    const validationError = rules.validateCategoryForm(this.data.categoryForm)
    if (validationError) {
      this.setData({ categoryError: validationError })
      return
    }
    this.setData({ categorySaving: true, categoryError: '' })
    try {
      await api.savePhotoCategory(rules.buildCategoryPayload(this.data.categoryForm))
      if (this.pageDisposed) return
      const keepDirty = this.data.photoEditing === true
      this.setData({
        categorySaving: false,
        categoryEditing: false,
        categoryForm: { ...EMPTY_CATEGORY_FORM },
      })
      if (keepDirty) this.markDirty()
      else this.clearDraft()
      wx.showToast({ title: '分类已保存', icon: 'success' })
      await this.loadPhoto()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        categorySaving: false,
        categoryError: this.handleContentError(error, '分类保存失败，请稍后重试'),
      })
    }
  },

  async onDeleteCategory(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (!id) return
    const confirmed = await confirmModal('删除分类？', '分类下仍有照片时无法删除。', '删除')
    if (!confirmed || this.pageDisposed) return
    try {
      await api.deletePhotoCategory(id)
      if (this.pageDisposed) return
      if (Number(this.data.categoryForm.id) === id) {
        this.setData({ categoryEditing: false, categoryForm: { ...EMPTY_CATEGORY_FORM } })
      }
      if (this.data.photoEditing && Number(this.data.photoForm.photoCategoryId) === id) {
        this.setData({ photoEditing: false, photoForm: { ...EMPTY_PHOTO_FORM } })
      }
      wx.showToast({ title: '分类已删除', icon: 'success' })
      await this.loadPhoto()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ photoError: this.handleContentError(error, '分类删除失败，请稍后重试') })
    }
  },

  async onMoveCategory(event) {
    if (this.data.photoSorting) return
    const index = Number(event.currentTarget.dataset.index)
    const direction = String(event.currentTarget.dataset.direction || '')
    const result = rules.moveListItem(this.data.photoCategories, index, direction)
    if (!result.moved) return
    this.setData({ photoSorting: true, photoError: '' })
    try {
      await api.savePhotoCategoryOrder(rules.buildOrderItems(result.list))
      if (this.pageDisposed) return
      this.setData({ photoSorting: false })
      await this.loadPhoto()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        photoSorting: false,
        photoError: this.handleContentError(error, '分类排序失败，请稍后重试'),
      })
    }
  },

  onNewPhoto() {
    if (!this.data.photoCategoryOptions.length) {
      this.setData({ photoError: '请先创建一个相册分类' })
      return
    }
    const defaultCategory = this.data.photoCategoryOptions.find(
      category => category.id === this.data.photoFilterId,
    ) || this.data.photoCategoryOptions[0]
    const index = Math.max(
      0,
      this.data.photoCategoryOptions.findIndex(category => category.id === defaultCategory.id),
    )
    this.setData({
      photoEditing: true,
      photoFormError: '',
      photoCategoryIndex: index,
      photoVisibilityIndex: 0,
      photoForm: {
        ...EMPTY_PHOTO_FORM,
        photoCategoryId: defaultCategory.id,
        visibility: 0,
      },
    })
  },

  onEditPhoto(event) {
    const index = Number(event.currentTarget.dataset.index)
    const photo = (this.data.photos || [])[index]
    if (!photo) return
    const categoryIndex = Math.max(
      0,
      this.data.photoCategoryOptions.findIndex(category => category.id === photo.photoCategoryId),
    )
    const time = splitDateTime(photo.takenTime)
    this.setData({
      photoEditing: true,
      photoFormError: '',
      photoCategoryIndex: categoryIndex,
      photoVisibilityIndex: visibilityIndexOf(this.data.visibilityOptions, photo.visibility),
      photoForm: {
        id: photo.id,
        photoCategoryId: photo.photoCategoryId,
        title: photo.title || '',
        description: photo.description || '',
        url: photo.url || '',
        takenDate: time.date,
        takenTime: time.time,
        location: photo.location || '',
        isCover: photo.isCover === true,
        visibility: Number(photo.visibility) || 0,
        baselineTakenTime: photo.takenTime || '',
      },
    })
  },

  onCancelPhoto() {
    const keepDirty = this.data.categoryEditing === true
    this.setData({ photoEditing: false, photoFormError: '', photoForm: { ...EMPTY_PHOTO_FORM } })
    if (!keepDirty) this.clearDraft()
  },

  onPhotoCategoryChange(event) {
    const index = Number(event.detail.value) || 0
    const category = this.data.photoCategoryOptions[index]
    if (!category) return
    this.setData({ photoCategoryIndex: index, 'photoForm.photoCategoryId': category.id })
    this.markDirty()
  },

  onPhotoVisibilityChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.visibilityOptions[index]
    if (!option) return
    const error = rules.validateVisibility(option.value, this.data.canPublish)
    if (error) {
      wx.showToast({ title: error, icon: 'none', duration: 2200 })
      return
    }
    this.setData({ photoVisibilityIndex: index, 'photoForm.visibility': option.value })
    this.markDirty()
  },

  async onSavePhoto() {
    if (this.data.photoSaving) return
    const form = { ...this.data.photoForm, canPublish: this.data.canPublish }
    const validationError = rules.validatePhotoForm(form)
    if (validationError) {
      this.setData({ photoFormError: validationError })
      return
    }
    const visibilityError = rules.validateVisibility(form.visibility, this.data.canPublish)
    if (visibilityError) {
      this.setData({ photoFormError: visibilityError })
      return
    }
    this.setData({ photoSaving: true, photoFormError: '' })
    try {
      const result = await api.savePhoto(rules.buildPhotoPayload(form))
      if (this.pageDisposed) return
      const keepDirty = this.data.categoryEditing === true
      this.setData({ photoSaving: false, photoEditing: false, photoForm: { ...EMPTY_PHOTO_FORM } })
      if (keepDirty) this.markDirty()
      else this.clearDraft()
      const feedback = rules.describeSaveReview(result, '照片已保存')
      this.showFeedback(feedback.kind, feedback.message)
      if (result && result.reviewStatus) this.loadReview()
      await this.loadPhoto()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        photoSaving: false,
        photoFormError: this.handleContentError(error, '照片保存失败，请稍后重试'),
      })
    }
  },

  async onDeletePhoto(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (!id) return
    const confirmed = await confirmModal('删除照片？', '删除后照片不再展示，且无法恢复。', '删除')
    if (!confirmed || this.pageDisposed) return
    try {
      await api.deletePhoto(id)
      if (this.pageDisposed) return
      if (Number(this.data.photoForm.id) === id) {
        this.setData({ photoEditing: false, photoForm: { ...EMPTY_PHOTO_FORM } })
      }
      wx.showToast({ title: '照片已删除', icon: 'success' })
      await this.loadPhoto()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({ photoError: this.handleContentError(error, '照片删除失败，请稍后重试') })
    }
  },

  /**
   * 照片排序必须先取回完整列表（不能只对当前分页排序），
   * 再按分类内 / 全局接口提交。
   */
  async onMovePhoto(event) {
    if (this.data.photoSorting) return
    const index = Number(event.currentTarget.dataset.index)
    const direction = String(event.currentTarget.dataset.direction || '')
    const categoryId = Number(this.data.photoFilterId) || 0
    const current = (this.data.photos || [])[index]
    if (!current) return
    this.setData({ photoSorting: true, photoError: '' })
    try {
      const sortList = await api.fetchPhotoSortList(categoryId)
      if (this.pageDisposed) return
      const source = Array.isArray(sortList) ? sortList : []
      const sortIndex = source.findIndex(item => item.id === current.id)
      if (sortIndex < 0) {
        this.setData({ photoSorting: false })
        return
      }
      const result = rules.moveListItem(source, sortIndex, direction)
      if (!result.moved) {
        this.setData({ photoSorting: false })
        return
      }
      const items = rules.buildOrderItems(result.list)
      if (categoryId) await api.savePhotoOrder(categoryId, items)
      else await api.savePhotoGlobalOrder(items)
      if (this.pageDisposed) return
      this.setData({ photoSorting: false })
      await this.loadPhotoPage(this.data.photoCurrent)
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        photoSorting: false,
        photoError: this.handleContentError(error, '照片排序失败，请稍后重试'),
      })
    }
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

  onNewAnniversary() {
    this.setData({
      anniversaryEditing: true,
      anniversaryFormError: '',
      anniversaryCategoryIndex: 0,
      anniversaryVisibilityIndex: 0,
      anniversaryForm: { ...EMPTY_ANNIVERSARY_FORM },
    })
  },

  onEditAnniversary(event) {
    const index = Number(event.currentTarget.dataset.index)
    const item = (this.data.anniversaries || [])[index]
    if (!item) return
    this.setData({
      anniversaryEditing: true,
      anniversaryFormError: '',
      anniversaryCategoryIndex: Math.max(
        0,
        this.data.anniversaryCategoryOptions.findIndex(option => option.value === item.category),
      ),
      anniversaryVisibilityIndex: visibilityIndexOf(this.data.visibilityOptions, item.visibility),
      anniversaryForm: {
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        anniversaryDate: item.anniversaryDate || '',
        repeatType: Number(item.repeatType) === 0 ? 0 : 1,
        category: item.category || 'other',
        colorCode: item.colorCode || '#D94F70',
        location: item.location || '',
        visibility: Number(item.visibility) || 0,
      },
    })
  },

  onCancelAnniversary() {
    this.setData({
      anniversaryEditing: false,
      anniversaryFormError: '',
      anniversaryForm: { ...EMPTY_ANNIVERSARY_FORM },
    })
    this.clearDraft()
  },

  onAnniversaryCategoryChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.anniversaryCategoryOptions[index]
    if (!option) return
    this.setData({ anniversaryCategoryIndex: index, 'anniversaryForm.category': option.value })
    this.markDirty()
  },

  onAnniversaryVisibilityChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.visibilityOptions[index]
    if (!option) return
    const error = rules.validateVisibility(option.value, this.data.canPublish)
    if (error) {
      wx.showToast({ title: error, icon: 'none', duration: 2200 })
      return
    }
    this.setData({ anniversaryVisibilityIndex: index, 'anniversaryForm.visibility': option.value })
    this.markDirty()
  },

  onAnniversaryRepeatChange(event) {
    const value = Number(event.detail.value) === 0 ? 0 : 1
    this.setData({ 'anniversaryForm.repeatType': value })
    this.markDirty()
  },

  async onSaveAnniversary() {
    if (this.data.anniversarySaving) return
    const form = { ...this.data.anniversaryForm, canPublish: this.data.canPublish }
    const validationError = rules.validateAnniversaryForm(form)
    if (validationError) {
      this.setData({ anniversaryFormError: validationError })
      return
    }
    const visibilityError = rules.validateVisibility(form.visibility, this.data.canPublish)
    if (visibilityError) {
      this.setData({ anniversaryFormError: visibilityError })
      return
    }
    this.setData({ anniversarySaving: true, anniversaryFormError: '' })
    try {
      const result = await api.saveAnniversary(rules.buildAnniversaryPayload(form))
      if (this.pageDisposed) return
      this.setData({
        anniversarySaving: false,
        anniversaryEditing: false,
        anniversaryForm: { ...EMPTY_ANNIVERSARY_FORM },
      })
      this.clearDraft()
      const feedback = rules.describeSaveReview(result, '纪念日已保存')
      this.showFeedback(feedback.kind, feedback.message)
      if (result && result.reviewStatus) this.loadReview()
      await this.loadAnniversary()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        anniversarySaving: false,
        anniversaryFormError: this.handleContentError(error, '纪念日保存失败，请稍后重试'),
      })
    }
  },

  async onDeleteAnniversary(event) {
    const id = Number(event.currentTarget.dataset.id)
    if (!id) return
    const confirmed = await confirmModal('删除纪念日？', '删除后不再展示，且无法恢复。', '删除')
    if (!confirmed || this.pageDisposed) return
    try {
      await api.deleteAnniversary(id)
      if (this.pageDisposed) return
      if (Number(this.data.anniversaryForm.id) === id) {
        this.setData({ anniversaryEditing: false, anniversaryForm: { ...EMPTY_ANNIVERSARY_FORM } })
      }
      wx.showToast({ title: '纪念日已删除', icon: 'success' })
      await this.loadAnniversary()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        anniversaryError: this.handleContentError(error, '纪念日删除失败，请稍后重试'),
      })
    }
  },

  async onMoveAnniversary(event) {
    if (this.data.anniversarySorting) return
    const index = Number(event.currentTarget.dataset.index)
    const direction = String(event.currentTarget.dataset.direction || '')
    const result = rules.moveListItem(this.data.anniversaries, index, direction)
    if (!result.moved) return
    this.setData({ anniversarySorting: true, anniversaryError: '' })
    try {
      await api.saveAnniversaryOrder(rules.buildOrderItems(result.list))
      if (this.pageDisposed) return
      this.setData({ anniversarySorting: false })
      await this.loadAnniversary()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        anniversarySorting: false,
        anniversaryError: this.handleContentError(error, '纪念日排序失败，请稍后重试'),
      })
    }
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
