/**
 * 小程序空间内容编辑的纯规则。
 *
 * 覆盖：
 * - 栏目可见性与 tab 恢复（首页不依赖模块权限，其余按 frontend:<module>:query）；
 * - 空间是否允许编辑 / 是否允许公开内容；
 * - 首页、故事、相册、纪念日的表单回填、提交体与校验；
 * - 排序项的构造与上下移动；
 * - 后端错误码 → 可读提示，以及需要刷新空间状态的冲突判断。
 *
 * 所有函数都不读写 wx.storage、不发起请求、不依赖页面，便于 node:test 直接验证。
 */
const {
  SPACE_STATUS,
} = require('./session-constants')
const { isValidSpaceId } = require('./session-rules')
const {
  composeLoveStartTime,
  parseBackendDateTime,
  splitLoveStartTime,
} = require('./space-edit')

/* -------------------- 栏目 -------------------- */

const CONTENT_TABS = Object.freeze([
  { key: 'home', label: '首页', module: 'home', requiresQueryPermission: false },
  { key: 'story', label: '故事', module: 'story', requiresQueryPermission: true },
  { key: 'message', label: '留言', module: 'message', requiresQueryPermission: true },
  { key: 'photo', label: '相册', module: 'photo', requiresQueryPermission: true },
  { key: 'anniversary', label: '纪念日', module: 'anniversary', requiresQueryPermission: true },
])

function resolveContentTabs(hasQueryPermission) {
  const canQuery = typeof hasQueryPermission === 'function' ? hasQueryPermission : () => false
  return CONTENT_TABS
    .filter(tab => !tab.requiresQueryPermission || canQuery(tab.module))
    .map(tab => ({ ...tab }))
}

function resolveActiveContentTab(requested, tabs) {
  const list = Array.isArray(tabs) ? tabs : []
  const value = typeof requested === 'string' ? requested.trim() : ''
  if (value && list.some(tab => tab.key === value)) return value
  return (list[0] && list[0].key) || ''
}

function isContentTabAllowed(key, tabs) {
  return (Array.isArray(tabs) ? tabs : []).some(tab => tab.key === key)
}

/* -------------------- 空间状态 -------------------- */

/**
 * 是否允许编辑空间内容（纯前端体验判断，服务端仍是最终授权方）。
 *
 * 与 SpaceContentAccessService 一致：
 * - 必须是有效成员（currentUserRole 为 1/2 且 memberCount > 0）；
 * - 只有等待绑定（0）与正常（1）允许编辑；
 * - 等待绑定阶段的写入权限（仅创建者）仍由服务端校验。
 */
function canEditSpaceContent(space) {
  if (!space || typeof space !== 'object') return false
  if (!isValidSpaceId(space.spaceId)) return false
  const status = Number(space.status)
  if (status !== SPACE_STATUS.WAITING && status !== SPACE_STATUS.NORMAL) return false
  const role = Number(space.currentUserRole)
  const count = Number(space.memberCount)
  if (!(role === 1 || role === 2)) return false
  if (!Number.isFinite(count) || count <= 0) return false
  // 等待绑定阶段服务端只允许创建者写入；前端同步收紧，避免展示必然失败的编辑入口。
  if (status === SPACE_STATUS.WAITING && space.creator !== true && role !== 1) return false
  return true
}

/**
 * 是否允许显式公开内容。
 *
 * 后端按「空间 status=1（已完成两人绑定）」判定；等待绑定阶段只能私密。
 */
function canPublishContent(space) {
  return Boolean(space) && Number(space.status) === SPACE_STATUS.NORMAL
}

const VISIBILITY_OPTIONS = Object.freeze([
  { value: 0, label: '仅空间成员可见' },
  { value: 1, label: '公开到恋爱广场' },
  { value: 2, label: '隐藏' },
])

function buildVisibilityOptions(canPublish) {
  return VISIBILITY_OPTIONS.map(option => {
    const disabled = option.value === 1 && !canPublish
    return {
      value: option.value,
      label: disabled ? `${option.label}（完成绑定后可用）` : option.label,
      disabled,
    }
  })
}

function visibilityLabel(value) {
  const found = VISIBILITY_OPTIONS.find(option => option.value === Number(value))
  return found ? found.label : '仅空间成员可见'
}

/** 提交前归一化可见性：没有公开资格时绝不允许把 1 发给服务端。 */
function normalizeVisibility(value, canPublish) {
  const parsed = Number(value)
  if (parsed !== 0 && parsed !== 1 && parsed !== 2) return 0
  if (parsed === 1 && !canPublish) return 0
  return parsed
}

function validateVisibility(value, canPublish) {
  if (Number(value) === 1 && !canPublish) {
    return '完成两人绑定后才能公开内容，当前只能保存为仅空间成员可见'
  }
  return ''
}

/* -------------------- 审核提示 -------------------- */

const REVIEW_STATUS_LABELS = Object.freeze({
  PENDING: '审核中',
  REJECTED: '审核未通过',
  PUBLISHED: '已公开',
  UNPUBLISHED: '已下架',
  DRAFT: '草稿',
})

function reviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[status] || ''
}

/**
 * 公开审核摘要（编辑页默认只展示一行）。
 *
 * 待审核 / 未通过必须出现在摘要里，保证折叠时仍然可发现；
 * 详细原因、驳回条目与重新提交入口由页面按需展开。
 */
function describeReview(review) {
  const source = review && typeof review === 'object' ? review : {}
  const visibilityText = trimText(source.visibilityText)
  const visibility = visibilityText || (Number(source.visibility) === 1 ? '公开中' : '私密')
  const rejectedItems = Array.isArray(source.rejectedItems) ? source.rejectedItems : []
  const pending = source.pending === true
  const hasRejected = rejectedItems.length > 0
  let progress = ''
  if (pending) {
    progress = '有待审核的修改'
  } else if (hasRejected) {
    progress = `${rejectedItems.length} 项未通过审核`
  } else {
    progress = trimText(source.lastReviewStatusText) || '暂无待审核内容'
  }
  return {
    visibility,
    progress,
    summary: `${visibility} · ${progress}`,
    pending,
    hasRejected,
    /** 需要保持可发现的异常状态（待审核 / 驳回） */
    needsAttention: pending || hasRejected,
  }
}

/**
 * 保存公开内容后的提示。
 *
 * 关键：审核中的编辑不能被说成“已公开”。
 */
function describeSaveReview(result, fallback) {
  const source = result && typeof result === 'object' ? result : {}
  const defaultText = fallback || '已保存'
  if (source.reviewStatus === 'PENDING' || source.reviewPending === true) {
    return {
      kind: 'stale',
      message: source.reviewMessage || '修改已保存，公开内容正在审核，恋爱广场暂时仍展示旧版本',
    }
  }
  if (source.reviewStatus === 'REJECTED') {
    return {
      kind: 'warning',
      message: source.reviewMessage || '修改已保存，但公开内容未通过审核',
    }
  }
  if (source.reviewStatus === 'UNPUBLISHED') {
    return {
      kind: 'warning',
      message: source.reviewMessage || '修改已保存，但该内容已被下架',
    }
  }
  if (source.restoredToPublished === true || source.reviewRestored === true) {
    return {
      kind: 'success',
      message: source.reviewMessage || '已恢复为当前公开版本，没有新的待审核内容',
    }
  }
  if (source.changed === false) {
    return {
      kind: 'stale',
      message: source.reviewMessage || '未检测到内容变化，未提交审核',
    }
  }
  return {
    kind: 'success',
    message: source.reviewMessage || defaultText,
  }
}

/* -------------------- 首页 -------------------- */

const HOME_CONFIG_KEYS = Object.freeze({
  boyName: 'boy_name',
  girlName: 'girl_name',
  boyAvatar: 'boy_avatar',
  girlAvatar: 'girl_avatar',
  heroPhoto1: 'home.hero_photo_1',
  heroPhoto2: 'home.hero_photo_2',
})

/**
 * 服务端 SpaceHomeVO → 编辑表单。
 *
 * 接口返回的是“生效值”，可能来自成员资料或平台默认图；
 * 输入框只保留空间配置本身（source=config），避免把默认值误保存成用户配置。
 */
function buildHomeForm(home) {
  const source = home && typeof home === 'object' ? home : {}
  const time = splitLoveStartTime(source.loveStartTime)
  return {
    spaceName: typeof source.spaceName === 'string' ? source.spaceName : '',
    description: typeof source.description === 'string' ? source.description : '',
    loveDate: time.date,
    loveTime: time.time,
    boyName: source.boyNameSource === 'config' ? (source.boyName || '') : '',
    girlName: source.girlNameSource === 'config' ? (source.girlName || '') : '',
    boyAvatar: source.boyAvatarSource === 'config' ? (source.boyAvatar || '') : '',
    girlAvatar: source.girlAvatarSource === 'config' ? (source.girlAvatar || '') : '',
    // 平台默认图只用于展示，不写回空间配置；否则一次无关保存会把默认图固化进用户空间。
    heroPhoto1: source.heroPhoto1Source === 'config' ? (source.heroPhoto1 || '') : '',
    heroPhoto2: source.heroPhoto2Source === 'config' ? (source.heroPhoto2 || '') : '',
  }
}

function trimText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateHomeForm(form) {
  const source = form || {}
  const name = trimText(source.spaceName)
  if (!name) return '空间名称为必填项'
  if (name.length > 30) return '空间名称不能超过 30 个字符'
  if (String(source.description || '').length > 500) return '空间简介不能超过 500 个字符'
  if (trimText(source.boyName).length > 30 || trimText(source.girlName).length > 30) {
    return '展示名不能超过 30 个字符'
  }
  const date = trimText(source.loveDate)
  const time = trimText(source.loveTime)
  if (Boolean(date) !== Boolean(time)) return '请同时选择恋爱开始的日期和时间'
  const imageFields = ['boyAvatar', 'girlAvatar', 'heroPhoto1', 'heroPhoto2']
  for (let index = 0; index < imageFields.length; index += 1) {
    if (!isSafeImageUrl(source[imageFields[index]])) {
      return '图片地址格式不正确，请重新上传'
    }
  }
  return ''
}

function buildHomePayload(form, baselineLoveStartTime) {
  const source = form || {}
  return {
    spaceName: trimText(source.spaceName),
    description: trimText(source.description),
    loveStartTime: composeLoveStartTime(
      { loveDate: source.loveDate, loveTime: source.loveTime },
      baselineLoveStartTime,
    ),
    configs: {
      [HOME_CONFIG_KEYS.boyName]: trimText(source.boyName),
      [HOME_CONFIG_KEYS.girlName]: trimText(source.girlName),
      [HOME_CONFIG_KEYS.boyAvatar]: trimText(source.boyAvatar),
      [HOME_CONFIG_KEYS.girlAvatar]: trimText(source.girlAvatar),
      [HOME_CONFIG_KEYS.heroPhoto1]: trimText(source.heroPhoto1),
      [HOME_CONFIG_KEYS.heroPhoto2]: trimText(source.heroPhoto2),
    },
  }
}

/* -------------------- 故事 -------------------- */

function validateChapterForm(form) {
  const name = trimText(form && form.name)
  if (!name) return '章节名称为必填项'
  if (name.length > 50) return '章节名称不能超过 50 个字符'
  return ''
}

function buildChapterPayload(form, sortOrder) {
  const source = form || {}
  const payload = {
    name: trimText(source.name),
    isVisible: source.isVisible !== false,
  }
  if (source.id) payload.id = source.id
  if (sortOrder !== undefined && sortOrder !== null) payload.sortOrder = sortOrder
  return payload
}

/** 时间展示精度：true-日期和时间 false-仅日期；历史缺失字段按 true 兼容。 */
function normalizeShowTime(value) {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLowerCase()
  if (text === 'false' || text === '0') return false
  if (text === 'true' || text === '1') return true
  const number = Number(value)
  return Number.isFinite(number) ? number !== 0 : true
}

function validateNodeForm(form) {
  const source = form || {}
  if (!source.chapterId) return '请选择故事所属章节'
  const title = trimText(source.title)
  if (!title) return '故事标题为必填项'
  if (title.length > 100) return '故事标题不能超过 100 个字符'
  if (String(source.summary || '').length > 500) return '故事摘要不能超过 500 个字符'
  if (String(source.content || '').length > 20000) return '故事正文不能超过 20000 个字符'
  if (String(source.location || '').length > 100) return '故事地点不能超过 100 个字符'
  if (trimText(source.tagLabel).length > 30) return '故事标签不能超过 30 个字符'
  if (!isSafeImageUrl(source.coverImage)) return '封面图片地址格式不正确，请重新上传'
  const date = trimText(source.happenedDate)
  if (!date) return '请选择故事发生日期'
  return ''
}

function buildNodePayload(form, sortOrder) {
  const source = form || {}
  const showTime = normalizeShowTime(source.showTime)
  const happenedDate = trimText(source.happenedDate)
  const payload = {
    chapterId: source.chapterId,
    title: trimText(source.title),
    summary: trimText(source.summary),
    content: typeof source.content === 'string' ? source.content : '',
    happenedTime: showTime
      ? composeLoveStartTime(
        { loveDate: happenedDate, loveTime: trimText(source.happenedTime) || '00:00' },
        source.baselineHappenedTime,
      )
      : composeLoveStartTime({ loveDate: happenedDate, loveTime: '00:00' }, ''),
    showTime,
    location: trimText(source.location),
    coverImage: trimText(source.coverImage),
    tagLabel: trimText(source.tagLabel),
    isMilestone: source.isMilestone === true,
    visibility: normalizeVisibility(source.visibility, source.canPublish === true),
  }
  if (source.id) payload.id = source.id
  if (sortOrder !== undefined && sortOrder !== null) payload.sortOrder = sortOrder
  return payload
}

/* -------------------- 相册 -------------------- */

function validateCategoryForm(form) {
  const name = trimText(form && form.categoryName)
  if (!name) return '分类名称为必填项'
  if (name.length > 50) return '分类名称不能超过 50 个字符'
  if (String(form.remark || '').length > 200) return '分类备注不能超过 200 个字符'
  return ''
}

function buildCategoryPayload(form, sortOrder) {
  const source = form || {}
  const payload = {
    categoryName: trimText(source.categoryName),
    isEnabled: source.isEnabled !== false,
    remark: trimText(source.remark),
  }
  if (source.id) payload.id = source.id
  if (sortOrder !== undefined && sortOrder !== null) payload.sortOrder = sortOrder
  return payload
}

function validatePhotoForm(form) {
  const source = form || {}
  if (!source.photoCategoryId) return '请选择照片所属分类'
  const url = trimText(source.url)
  if (!url) return '请先上传照片'
  if (!isSafeImageUrl(url)) return '图片地址格式不正确，请重新上传'
  if (trimText(source.title).length > 100) return '照片标题不能超过 100 个字符'
  if (String(source.description || '').length > 500) return '照片描述不能超过 500 个字符'
  if (trimText(source.location).length > 100) return '拍摄地点不能超过 100 个字符'
  if (source.isCover === true && Number(source.visibility) === 2) {
    return '封面照片不能同时设为隐藏'
  }
  const date = trimText(source.takenDate)
  const time = trimText(source.takenTime)
  if (Boolean(date) !== Boolean(time)) return '请同时选择拍摄日期和时间'
  return ''
}

function buildPhotoPayload(form, sortOrder) {
  const source = form || {}
  const payload = {
    photoCategoryId: source.photoCategoryId,
    title: trimText(source.title),
    description: trimText(source.description),
    url: trimText(source.url),
    takenTime: composeLoveStartTime(
      { loveDate: source.takenDate, loveTime: source.takenTime },
      source.baselineTakenTime,
    ),
    location: trimText(source.location),
    isCover: source.isCover === true,
    visibility: normalizeVisibility(source.visibility, source.canPublish === true),
  }
  if (source.id) payload.id = source.id
  if (sortOrder !== undefined && sortOrder !== null) payload.sortOrder = sortOrder
  return payload
}

/* -------------------- 纪念日 -------------------- */

const ANNIVERSARY_CATEGORIES = Object.freeze([
  { value: 'love', label: '恋爱' },
  { value: 'birthday', label: '生日' },
  { value: 'journey', label: '旅行' },
  { value: 'memory', label: '回忆' },
  { value: 'milestone', label: '里程碑' },
  { value: 'other', label: '其他' },
])

function validateAnniversaryForm(form) {
  const source = form || {}
  const title = trimText(source.title)
  if (!title) return '纪念日名称为必填项'
  if (title.length > 100) return '纪念日名称不能超过 100 个字符'
  if (String(source.description || '').length > 500) return '纪念日描述不能超过 500 个字符'
  if (!trimText(source.anniversaryDate)) return '请选择纪念日日期'
  if (trimText(source.location).length > 100) return '纪念日地点不能超过 100 个字符'
  return ''
}

function buildAnniversaryPayload(form, sortOrder) {
  const source = form || {}
  const payload = {
    title: trimText(source.title),
    description: trimText(source.description),
    anniversaryDate: trimText(source.anniversaryDate),
    repeatType: Number(source.repeatType) === 0 ? 0 : 1,
    category: trimText(source.category) || 'other',
    location: trimText(source.location),
    visibility: normalizeVisibility(source.visibility, source.canPublish === true),
  }
  if (source.id) payload.id = source.id
  if (sortOrder !== undefined && sortOrder !== null) payload.sortOrder = sortOrder
  return payload
}

function anniversaryCategoryLabel(value) {
  const found = ANNIVERSARY_CATEGORIES.find(item => item.value === value)
  return found ? found.label : '其他'
}

/* -------------------- 留言 -------------------- */

function validateMessageContent(value) {
  const content = trimText(value)
  if (!content) return '留言内容不能为空'
  if (content.length > 500) return '留言不能超过 500 个字符'
  return ''
}

/* -------------------- 排序 -------------------- */

/** 把完整列表转成后端排序接口需要的 items（10、20、30 …）。 */
function buildOrderItems(list) {
  return (Array.isArray(list) ? list : []).map((item, index) => ({
    id: item.id,
    sortOrder: (index + 1) * 10,
  }))
}

/**
 * 上下移动列表项。返回新数组，不修改原列表。
 *
 * @returns {{ list: Array, moved: boolean, index: number }}
 */
function moveListItem(list, index, direction) {
  const source = Array.isArray(list) ? list.slice() : []
  const from = Number(index)
  const delta = direction === 'up' ? -1 : 1
  const to = from + delta
  if (!Number.isInteger(from) || from < 0 || from >= source.length) {
    return { list: source, moved: false, index: from }
  }
  if (to < 0 || to >= source.length) return { list: source, moved: false, index: from }
  const [item] = source.splice(from, 1)
  source.splice(to, 0, item)
  return { list: source, moved: true, index: to }
}

/* -------------------- 展示格式 -------------------- */

function formatContentDate(value) {
  const fields = parseBackendDateTime(value)
  if (!fields) return ''
  const pad = number => String(number).padStart(2, '0')
  return `${fields.year}.${pad(fields.month)}.${pad(fields.day)}`
}

function formatContentDateTime(value, showTime) {
  const fields = parseBackendDateTime(value)
  if (!fields) return ''
  const pad = number => String(number).padStart(2, '0')
  const date = `${fields.year}.${pad(fields.month)}.${pad(fields.day)}`
  // 仅日期模式不展示任何时分秒；其余（含历史缺失字段）展示到秒。
  if (showTime === false) return date
  return `${date} ${pad(fields.hour)}:${pad(fields.minute)}:${pad(fields.second)}`
}

function isSafeImageUrl(value) {
  const text = trimText(value)
  return text.length === 0 || /^(https?:\/\/|\/)[^\s]*$/i.test(text)
}

/* -------------------- 错误码 -------------------- */

const CONTENT_ERROR_MESSAGES = Object.freeze({
  20003: '故事不存在或已被删除，请刷新后重试',
  20006: '留言不存在或已被删除，请刷新后重试',
  20007: '回复不存在或已被删除，请刷新后重试',
  20021: '照片不存在或已被删除，请刷新后重试',
  20022: '照片分类不存在或已被删除，请刷新后重试',
  20023: '照片分类名称已存在',
  20024: '该分类下仍有照片，无法删除',
  20025: '纪念日不存在或已被删除，请刷新后重试',
  20026: '只能删除自己发布的留言',
  20027: '只能删除自己发布的回复',
  20034: '你不是这个空间的成员，无法编辑内容',
  20035: '当前空间状态不允许此操作，请刷新空间状态后重试',
  20047: '空间已冻结，恢复后才能继续编辑',
  20048: '空间已归档，恢复后才能继续编辑',
  20058: '情侣空间已完成解绑，无法继续编辑',
  20064: '只有等待另一半加入时才能编辑空间信息',
  20065: '当前空间状态或成员身份不允许编辑内容',
  20067: '内容不属于当前情侣空间，请刷新后重试',
  20068: '章节下仍有故事，无法删除',
  20069: '完成两人绑定后才能公开内容',
  20070: '图片仅支持 JPG、PNG、WebP 或 GIF，且不能超过 5MB',
  20081: '已有待审核的修改，请等待审核完成',
  20103: '空间状态已经发生变化，请刷新后重试',
})

/** 需要强制刷新空间状态的业务错误码。 */
const CONTENT_CONFLICT_CODES = Object.freeze([
  '20034',
  '20035',
  '20047',
  '20048',
  '20058',
  '20064',
  '20065',
  '20067',
  '20069',
  '20096',
  '20103',
])

function isContentConflict(error) {
  if (!error || typeof error !== 'object') return false
  return CONTENT_CONFLICT_CODES.indexOf(String(error.errorCode || '')) !== -1
}

function buildContentErrorMessage(error, fallback) {
  const defaultMessage = fallback || '操作失败，请稍后重试'
  if (!error || typeof error !== 'object') return defaultMessage
  const code = String(error.errorCode || '')
  if (CONTENT_ERROR_MESSAGES[code]) return CONTENT_ERROR_MESSAGES[code]
  const message = typeof error.message === 'string' ? error.message.trim() : ''
  return message || defaultMessage
}

module.exports = {
  CONTENT_TABS,
  resolveContentTabs,
  resolveActiveContentTab,
  isContentTabAllowed,
  canEditSpaceContent,
  canPublishContent,
  VISIBILITY_OPTIONS,
  buildVisibilityOptions,
  visibilityLabel,
  normalizeVisibility,
  validateVisibility,
  REVIEW_STATUS_LABELS,
  reviewStatusLabel,
  describeReview,
  describeSaveReview,
  HOME_CONFIG_KEYS,
  buildHomeForm,
  validateHomeForm,
  buildHomePayload,
  validateChapterForm,
  buildChapterPayload,
  normalizeShowTime,
  validateNodeForm,
  buildNodePayload,
  validateCategoryForm,
  buildCategoryPayload,
  validatePhotoForm,
  buildPhotoPayload,
  ANNIVERSARY_CATEGORIES,
  validateAnniversaryForm,
  buildAnniversaryPayload,
  anniversaryCategoryLabel,
  validateMessageContent,
  buildOrderItems,
  moveListItem,
  formatContentDate,
  formatContentDateTime,
  isSafeImageUrl,
  CONTENT_CONFLICT_CODES,
  isContentConflict,
  buildContentErrorMessage,
}
