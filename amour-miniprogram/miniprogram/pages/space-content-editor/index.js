/**
 * 空间内容新增 / 编辑页。
 *
 * 故事、相册、纪念日等内容的表单从空间工作台拆出，避免在工作台内联展开。
 * 编辑模式只接收 id，并按 id 重新查询服务端数据，不依赖列表缓存。
 */
const { guardPageReady } = require('../../utils/access-control')
const { hasFrontendQueryPermission } = require('../../utils/auth')
const sessionState = require('../../utils/session-state')
const {
  SESSION_STATUS,
  SPACE_STUDIO_ROUTE,
} = require('../../utils/session-constants')
const api = require('../../utils/space-content-api')
const rules = require('../../utils/space-content-rules')

const PHOTO_QUERY_PAGE_SIZE = 100

const KIND_CONFIG = Object.freeze({
  chapter: { module: 'story', noun: '章节' },
  story: { module: 'story', noun: '故事' },
  category: { module: 'photo', noun: '分类' },
  photo: { module: 'photo', noun: '照片' },
  anniversary: { module: 'anniversary', noun: '纪念日' },
})

const EMPTY_FORMS = Object.freeze({
  chapter: { id: null, name: '', isVisible: true },
  story: {
    id: null,
    chapterId: 0,
    title: '',
    summary: '',
    content: '',
    happenedDate: '',
    happenedTime: '',
    showTime: true,
    location: '',
    coverImage: '',
    tagLabel: '',
    isMilestone: false,
    visibility: 0,
    baselineHappenedTime: '',
  },
  category: { id: null, categoryName: '', remark: '', isEnabled: true },
  photo: {
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
  },
  anniversary: {
    id: null,
    title: '',
    description: '',
    anniversaryDate: '',
    repeatType: 1,
    category: 'love',
    location: '',
    visibility: 0,
  },
})

const REPEAT_OPTIONS = Object.freeze(['仅此一次', '每年重复'])

function emptyForm(kind) {
  return JSON.parse(JSON.stringify(EMPTY_FORMS[kind]))
}

function parsePositiveId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

function splitDateTime(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(text)
  if (!match) return { date: '', time: '' }
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` }
}

function pageTitleFor(kind, editing) {
  const noun = KIND_CONFIG[kind] ? KIND_CONFIG[kind].noun : '内容'
  return `${editing ? '编辑' : '新建'}${noun}`
}

function readPageDepth() {
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    return Array.isArray(pages) && pages.length ? pages.length : 1
  } catch (error) {
    return 1
  }
}

function confirmDiscard() {
  return new Promise((resolve) => {
    wx.showModal({
      title: '放弃未保存的修改？',
      content: '返回后本次填写的内容不会保留。',
      confirmText: '放弃返回',
      cancelText: '继续编辑',
      confirmColor: '#b85060',
      success: result => resolve(Boolean(result && result.confirm)),
      fail: () => resolve(false),
    })
  })
}

function selectedIndex(options, value, key) {
  const index = (Array.isArray(options) ? options : [])
    .findIndex(option => String(option[key]) === String(value))
  return index < 0 ? 0 : index
}

function saveToast(kind, result) {
  if (result && result.reviewStatus === 'PENDING') return '已提交审核'
  const noun = KIND_CONFIG[kind] ? KIND_CONFIG[kind].noun : '内容'
  return `${noun}已保存`
}

Page({
  data: {
    loading: true,
    pageReady: false,
    pageError: '',
    pageTitle: '编辑内容',
    kind: '',
    itemId: 0,
    canPublish: false,
    form: {},
    saving: false,
    uploading: false,
    formError: '',
    blockedReason: '',
    chapterOptions: [],
    chapterIndex: 0,
    categoryOptions: [],
    categoryIndex: 0,
    visibilityOptions: [],
    visibilityIndex: 0,
    repeatOptions: REPEAT_OPTIONS,
    anniversaryCategoryOptions: rules.ANNIVERSARY_CATEGORIES,
    anniversaryCategoryIndex: 0,
  },

  onLoad(query) {
    this.pageDisposed = false
    this.dirty = false
    this.navConfirming = false
    this.uploadingField = ''
    const kind = String((query && query.kind) || '')
    const itemId = parsePositiveId(query && query.id)
    this.routeQuery = query || {}
    this.setData({
      kind,
      itemId,
      pageTitle: pageTitleFor(kind, Boolean(itemId)),
    })
    this.bootstrap()
  },

  onUnload() {
    this.pageDisposed = true
  },

  async bootstrap() {
    if (this.pageDisposed) return
    this.setData({ loading: true, pageError: '', formError: '', blockedReason: '' })
    const allowed = await guardPageReady('pages/space-content-editor/index', { silent: true })
    if (!allowed || this.pageDisposed) return

    const kind = this.data.kind
    const config = KIND_CONFIG[kind]
    if (!config) {
      this.setData({ loading: false, pageReady: true, pageError: '无法识别要编辑的内容类型' })
      return
    }

    const snapshot = await sessionState.ensureSessionReady()
      .catch(() => sessionState.getSnapshot())
    if (this.pageDisposed) return
    const space = snapshot && snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
      ? snapshot.space
      : null
    if (!rules.canEditSpaceContent(space)) {
      this.setData({
        loading: false,
        pageReady: true,
        pageError: '当前空间状态不允许编辑内容',
      })
      return
    }
    if (!hasFrontendQueryPermission(config.module)) {
      this.setData({
        loading: false,
        pageReady: true,
        pageError: `当前账号没有${config.noun}管理权限`,
      })
      return
    }

    const canPublish = rules.canPublishContent(space)
    this.setData({
      pageReady: true,
      canPublish,
      visibilityOptions: rules.buildVisibilityOptions(canPublish),
    })
    try {
      await this.loadForm()
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        loading: false,
        pageError: this.errorMessage(error, '内容加载失败，请稍后重试'),
      })
    }
  },

  async loadForm() {
    const kind = this.data.kind
    if (kind === 'chapter') await this.loadChapter()
    else if (kind === 'story') await this.loadStory()
    else if (kind === 'category') await this.loadCategory()
    else if (kind === 'photo') await this.loadPhoto()
    else if (kind === 'anniversary') await this.loadAnniversary()
    if (this.pageDisposed) return
    this.dirty = false
    this.setData({ loading: false })
  },

  async loadChapter() {
    const list = await api.fetchStoryChapters()
    if (this.pageDisposed) return
    const item = this.data.itemId
      ? list.find(record => Number(record.id) === this.data.itemId)
      : null
    if (this.data.itemId && !item) throw new Error('章节不存在或已被删除')
    this.setData({
      form: item ? {
        id: item.id,
        name: item.name || '',
        isVisible: item.isVisible !== false,
      } : emptyForm('chapter'),
    })
  },

  async loadStory() {
    const [chapters, nodes] = await Promise.all([
      api.fetchStoryChapters(),
      api.fetchStoryNodes(),
    ])
    if (this.pageDisposed) return
    const chapterOptions = (Array.isArray(chapters) ? chapters : []).map(chapter => ({
      id: chapter.id,
      name: chapter.name || '未命名章节',
    }))
    const item = this.data.itemId
      ? nodes.find(record => Number(record.id) === this.data.itemId)
      : null
    if (this.data.itemId && !item) throw new Error('故事不存在或已被删除')

    let chapterId = item ? Number(item.chapterId) : parsePositiveId(this.routeQuery.chapterId)
    if (!chapterOptions.some(option => Number(option.id) === chapterId)) {
      chapterId = chapterOptions.length ? Number(chapterOptions[0].id) : 0
    }
    const happened = item ? splitDateTime(item.happenedTime) : { date: '', time: '' }
    const form = item ? {
      id: item.id,
      chapterId,
      title: item.title || '',
      summary: item.summary || '',
      content: item.content || '',
      happenedDate: happened.date,
      happenedTime: happened.time,
      showTime: rules.normalizeShowTime(item.showTime),
      location: item.location || '',
      coverImage: item.coverImage || '',
      tagLabel: item.tagLabel || '',
      isMilestone: item.isMilestone === true,
      visibility: Number(item.visibility) || 0,
      baselineHappenedTime: item.happenedTime || '',
    } : {
      ...emptyForm('story'),
      chapterId,
    }
    this.setData({
      chapterOptions,
      chapterIndex: selectedIndex(chapterOptions, chapterId, 'id'),
      visibilityIndex: selectedIndex(this.data.visibilityOptions, form.visibility, 'value'),
      form,
      blockedReason: chapterOptions.length ? '' : '请先在空间编辑中创建一个故事章节',
    })
  },

  async loadCategory() {
    const list = await api.fetchPhotoCategories()
    if (this.pageDisposed) return
    const item = this.data.itemId
      ? list.find(record => Number(record.id) === this.data.itemId)
      : null
    if (this.data.itemId && !item) throw new Error('相册分类不存在或已被删除')
    this.setData({
      form: item ? {
        id: item.id,
        categoryName: item.categoryName || '',
        remark: item.remark || '',
        isEnabled: item.isEnabled !== false,
      } : emptyForm('category'),
    })
  },

  async findPhoto(id) {
    let current = 1
    let totalPages = 1
    while (current <= totalPages) {
      const result = (await api.fetchPhotoManagePage(current, PHOTO_QUERY_PAGE_SIZE, 0)) || {}
      const records = Array.isArray(result.records) ? result.records : []
      const found = records.find(record => Number(record.id) === Number(id))
      if (found) return found
      const total = Number(result.total) || 0
      totalPages = Math.max(1, Math.ceil(total / PHOTO_QUERY_PAGE_SIZE))
      current += 1
    }
    return null
  },

  async loadPhoto() {
    const categories = await api.fetchPhotoCategories()
    if (this.pageDisposed) return
    const categoryOptions = (Array.isArray(categories) ? categories : []).map(category => ({
      id: category.id,
      categoryName: category.categoryName || '未命名分类',
    }))
    const item = this.data.itemId ? await this.findPhoto(this.data.itemId) : null
    if (this.pageDisposed) return
    if (this.data.itemId && !item) throw new Error('照片不存在或已被删除')

    let categoryId = item ? Number(item.photoCategoryId) : parsePositiveId(this.routeQuery.categoryId)
    if (!categoryOptions.some(option => Number(option.id) === categoryId)) {
      categoryId = categoryOptions.length ? Number(categoryOptions[0].id) : 0
    }
    const taken = item ? splitDateTime(item.takenTime) : { date: '', time: '' }
    const form = item ? {
      id: item.id,
      photoCategoryId: categoryId,
      title: item.title || '',
      description: item.description || '',
      url: item.url || '',
      takenDate: taken.date,
      takenTime: taken.time,
      location: item.location || '',
      isCover: item.isCover === true,
      visibility: Number(item.visibility) || 0,
      baselineTakenTime: item.takenTime || '',
    } : {
      ...emptyForm('photo'),
      photoCategoryId: categoryId,
    }
    this.setData({
      categoryOptions,
      categoryIndex: selectedIndex(categoryOptions, categoryId, 'id'),
      visibilityIndex: selectedIndex(this.data.visibilityOptions, form.visibility, 'value'),
      form,
      blockedReason: categoryOptions.length ? '' : '请先在空间编辑中创建一个相册分类',
    })
  },

  async loadAnniversary() {
    const list = await api.fetchAnniversaries()
    if (this.pageDisposed) return
    const item = this.data.itemId
      ? list.find(record => Number(record.id) === this.data.itemId)
      : null
    if (this.data.itemId && !item) throw new Error('纪念日不存在或已被删除')
    const form = item ? {
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      anniversaryDate: item.anniversaryDate || '',
      repeatType: Number(item.repeatType) === 0 ? 0 : 1,
      category: item.category || 'other',
      location: item.location || '',
      visibility: Number(item.visibility) || 0,
    } : emptyForm('anniversary')
    this.setData({
      form,
      visibilityIndex: selectedIndex(this.data.visibilityOptions, form.visibility, 'value'),
      anniversaryCategoryIndex: selectedIndex(
        this.data.anniversaryCategoryOptions,
        form.category,
        'value',
      ),
    })
  },

  onRetryPage() {
    this.bootstrap()
  },

  markDirty() {
    this.dirty = true
  },

  onInput(event) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) return
    this.setData({ [`form.${field}`]: event.detail.value })
    this.markDirty()
  },

  onSwitchChange(event) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) return
    this.setData({ [`form.${field}`]: Boolean(event.detail.value) })
    this.markDirty()
  },

  onDateChange(event) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) return
    this.setData({ [`form.${field}`]: event.detail.value })
    this.markDirty()
  },

  onShowTimeChange(event) {
    const value = event.currentTarget.dataset.showTime
    this.setData({ 'form.showTime': value === true || value === 'true' })
    this.markDirty()
  },

  onClearTime(event) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) return
    this.setData({ [`form.${field}`]: '' })
    this.markDirty()
  },

  onClearDate(event) {
    const dateField = String(event.currentTarget.dataset.dateField || '')
    const timeField = String(event.currentTarget.dataset.timeField || '')
    if (!dateField || !timeField) return
    this.setData({ [`form.${dateField}`]: '', [`form.${timeField}`]: '' })
    this.markDirty()
  },

  onChapterChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.chapterOptions[index]
    if (!option) return
    this.setData({ chapterIndex: index, 'form.chapterId': option.id })
    this.markDirty()
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.categoryOptions[index]
    if (!option) return
    this.setData({ categoryIndex: index, 'form.photoCategoryId': option.id })
    this.markDirty()
  },

  onVisibilityChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.visibilityOptions[index]
    if (!option) return
    const error = rules.validateVisibility(option.value, this.data.canPublish)
    if (error) {
      wx.showToast({ title: error, icon: 'none', duration: 2200 })
      return
    }
    this.setData({ visibilityIndex: index, 'form.visibility': option.value })
    this.markDirty()
  },

  onRepeatChange(event) {
    const value = Number(event.detail.value) === 0 ? 0 : 1
    this.setData({ 'form.repeatType': value })
    this.markDirty()
  },

  onAnniversaryCategoryChange(event) {
    const index = Number(event.detail.value) || 0
    const option = this.data.anniversaryCategoryOptions[index]
    if (!option) return
    this.setData({ anniversaryCategoryIndex: index, 'form.category': option.value })
    this.markDirty()
  },

  async onChooseImage() {
    if (this.data.uploading) return
    this.setData({ uploading: true, formError: '' })
    const upload = (filePath) => {
      if (!filePath) {
        this.setData({ uploading: false })
        return
      }
      api.uploadSpaceImage(filePath).then((url) => {
        if (this.pageDisposed) return
        const field = this.data.kind === 'story' ? 'coverImage' : 'url'
        this.setData({ [`form.${field}`]: url, uploading: false })
        this.markDirty()
        wx.showToast({ title: '图片已上传', icon: 'success' })
      }).catch((error) => {
        if (this.pageDisposed) return
        this.setData({
          uploading: false,
          formError: this.errorMessage(error, '图片上传失败，请稍后重试'),
        })
      })
    }
    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (result) => {
          const file = result && result.tempFiles && result.tempFiles[0]
          upload(file && file.tempFilePath)
        },
        fail: () => this.setData({ uploading: false }),
      })
      return
    }
    if (typeof wx.chooseImage === 'function') {
      wx.chooseImage({
        count: 1,
        success: (result) => {
          const paths = result && result.tempFilePaths
          upload(Array.isArray(paths) ? paths[0] : '')
        },
        fail: () => this.setData({ uploading: false }),
      })
      return
    }
    this.setData({ uploading: false, formError: '当前环境不支持选择图片' })
  },

  onClearImage() {
    const field = this.data.kind === 'story' ? 'coverImage' : 'url'
    this.setData({ [`form.${field}`]: '' })
    this.markDirty()
  },

  validateForm(form) {
    const kind = this.data.kind
    if (kind === 'chapter') return rules.validateChapterForm(form)
    if (kind === 'story') return rules.validateNodeForm(form)
    if (kind === 'category') return rules.validateCategoryForm(form)
    if (kind === 'photo') return rules.validatePhotoForm(form)
    if (kind === 'anniversary') return rules.validateAnniversaryForm(form)
    return '无法识别要保存的内容类型'
  },

  buildPayload(form) {
    const kind = this.data.kind
    if (kind === 'chapter') return rules.buildChapterPayload(form)
    if (kind === 'story') return rules.buildNodePayload(form)
    if (kind === 'category') return rules.buildCategoryPayload(form)
    if (kind === 'photo') return rules.buildPhotoPayload(form)
    return rules.buildAnniversaryPayload(form)
  },

  saveRequest(payload) {
    const kind = this.data.kind
    if (kind === 'chapter') return api.saveStoryChapter(payload)
    if (kind === 'story') return api.saveStoryNode(payload)
    if (kind === 'category') return api.savePhotoCategory(payload)
    if (kind === 'photo') return api.savePhoto(payload)
    return api.saveAnniversary(payload)
  },

  async onSave() {
    if (this.data.saving || this.data.uploading || this.data.blockedReason) return
    const needsVisibility = ['story', 'photo', 'anniversary'].includes(this.data.kind)
    const form = {
      ...this.data.form,
      canPublish: this.data.canPublish,
    }
    const validationError = this.validateForm(form)
    if (validationError) {
      this.setData({ formError: validationError })
      return
    }
    if (needsVisibility) {
      const visibilityError = rules.validateVisibility(form.visibility, this.data.canPublish)
      if (visibilityError) {
        this.setData({ formError: visibilityError })
        return
      }
    }

    this.setData({ saving: true, formError: '' })
    try {
      const result = await this.saveRequest(this.buildPayload(form))
      if (this.pageDisposed) return
      this.dirty = false
      this.setData({ saving: false })
      wx.showToast({ title: saveToast(this.data.kind, result), icon: 'success' })
      this.leavePage()
    } catch (error) {
      if (this.pageDisposed) return
      if (rules.isContentConflict(error)) {
        sessionState.refreshAfterSpaceChange('space-content-editor:conflict')
          .catch(() => undefined)
      }
      this.setData({
        saving: false,
        formError: this.errorMessage(error, '保存失败，请稍后重试'),
      })
    }
  },

  async onNavBack() {
    if (this.data.saving || this.navConfirming) return
    if (this.data.uploading) {
      wx.showToast({ title: '图片正在上传，请稍候', icon: 'none' })
      return
    }
    if (!this.dirty) {
      this.leavePage()
      return
    }
    this.navConfirming = true
    const confirmed = await confirmDiscard()
    this.navConfirming = false
    if (confirmed && !this.pageDisposed) this.leavePage()
  },

  leavePage() {
    if (readPageDepth() > 1) {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.reLaunch({ url: SPACE_STUDIO_ROUTE }),
      })
      return
    }
    wx.reLaunch({ url: SPACE_STUDIO_ROUTE })
  },

  errorMessage(error, fallback) {
    return rules.buildContentErrorMessage(error, fallback)
  },
})
