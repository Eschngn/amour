/**
 * 登录态 / 情侣空间状态的纯规则。
 *
 * 这里只做「输入状态快照 → 输出判定结果」的纯函数：
 * - 不读写 wx.storage；
 * - 不发起请求；
 * - 不依赖任何页面。
 *
 * 因此可以脱离小程序运行时做单元测试，也让 session-state（状态源）、
 * access-control（路由守卫）和 bottom-nav（Tab 渲染）共用同一份判定规则，
 * 避免各页面自行拼装 if / else。
 */
const {
  SESSION_STATUS,
  SESSION_BUCKET,
  SPACE_STATUS,
  TAB_DEFINITIONS,
  MINIMAL_TAB_IDS,
  FULL_TAB_IDS,
  PAGE_ACCESS,
  PROFILE_ROUTE,
  SPACE_REQUIRED_TOAST,
} = require('./session-constants')

/** 空间标识是否有效：后端用自增 ID，这里只接受正整数或数字字符串。 */
function isValidSpaceId(spaceId) {
  if (spaceId === null || spaceId === undefined) return false
  if (typeof spaceId === 'number') return Number.isInteger(spaceId) && spaceId > 0
  if (typeof spaceId === 'string') return /^\d+$/.test(spaceId.trim()) && Number(spaceId) > 0
  return false
}

/**
 * 是否拥有情侣空间。
 *
 * 语义与后端 /space/status 对齐：
 * - data = null：没有创建、也没有绑定 / 加入任何空间；
 * - data.spaceId 存在：已经加入空间（status=0 等待绑定也算“已创建”，此时可以邀请另一半）；
 * - status=5（已解绑 / 逻辑删除）不再视为拥有空间。
 */
function deriveHasSpace(space) {
  if (!space || typeof space !== 'object') return false
  if (!isValidSpaceId(space.spaceId)) return false
  // status=5（已解绑）与 status=6（已销毁）都不再是「我的情侣空间」：
  // 销毁后普通用户不可见、不可访问，只有管理员可以从留档恢复。
  const status = Number(space.status)
  return status !== SPACE_STATUS.DELETED && status !== SPACE_STATUS.DESTROYED
}

/** 空间是否已被创建者销毁（status=6）。 */
function isDestroyedSpace(space) {
  if (!space || typeof space !== 'object') return false
  if (!isValidSpaceId(space.spaceId)) return false
  return Number(space.status) === SPACE_STATUS.DESTROYED
}

/** 后端销毁相关业务错误码（与 ResponseCodeEnum 保持一致）。 */
const SPACE_DESTROY_ERROR_CODE = Object.freeze({
  NOT_CREATOR: '20093',
  PARTNER_JOINED: '20094',
  STATUS_NOT_ALLOWED: '20095',
  DESTROYED: '20096',
  NOT_MEMBER: '20034',
})

/**
 * 销毁入口是否展示：只有「当前用户是创建者 + 另一半尚未加入」才展示。
 *
 * 前端隐藏只用于体验，真正的权限与成员关系校验在服务端。
 */
function canShowDestroyEntry(space) {
  if (!isWaitingForPartner(space)) return false
  if (space.creator !== true) return false
  const count = Number(space.memberCount)
  return !Number.isFinite(count) || count < 2
}

/**
 * 是否允许发起销毁：创建者、有效成员恰好 1 人、空间处于等待绑定（或历史单人正常）状态。
 */
function canDestroySpace(space) {
  if (!deriveHasSpace(space)) return false
  if (space.creator !== true) return false
  if (space.unbindPending === true) return false
  const count = Number(space.memberCount)
  if (Number.isFinite(count) && count !== 1) return false
  const status = Number(space.status)
  return status === SPACE_STATUS.WAITING || status === SPACE_STATUS.NORMAL
}

/** 销毁被阻止的可展示原因；可以销毁时返回空字符串。 */
function destroyBlockReason(space) {
  if (!deriveHasSpace(space)) {
    return isDestroyedSpace(space)
      ? '空间已销毁，只有管理员可以从留档恢复'
      : '还没有可以销毁的情侣空间'
  }
  if (space.creator !== true) return '只有空间创建者才能销毁空间'
  const count = Number(space.memberCount)
  if (Number.isFinite(count) && count >= 2) return '另一半已加入，不能再销毁空间'
  if (space.unbindPending === true) return '存在待处理的解绑申请，请先处理'
  const status = Number(space.status)
  if (status === SPACE_STATUS.FROZEN || status === SPACE_STATUS.ARCHIVED) {
    return '冻结或归档的空间不能直接销毁'
  }
  if (status !== SPACE_STATUS.WAITING && status !== SPACE_STATUS.NORMAL) {
    return '当前空间状态不允许销毁'
  }
  return ''
}

/**
 * 判断销毁请求失败是否属于「服务端拒绝且需要刷新状态」的场景。
 *
 * 另一半已加入 / 状态已变化都意味着本地状态过期，必须重新读取服务器状态，
 * 不能只依赖入口隐藏来保证安全。
 */
function isDestroyRejectedByServer(error) {
  if (!error) return false
  const code = String(error.errorCode || '')
  return code === SPACE_DESTROY_ERROR_CODE.PARTNER_JOINED
    || code === SPACE_DESTROY_ERROR_CODE.STATUS_NOT_ALLOWED
    || code === SPACE_DESTROY_ERROR_CODE.NOT_CREATOR
}

/** 空间是否处于“等待另一半加入”状态（已创建但只有一个人）。 */
function isWaitingForPartner(space) {
  return deriveHasSpace(space) && Number(space.status) === SPACE_STATUS.WAITING
}

/** 空间是否处于正常可用状态（status=1）。 */
function isNormalSpace(space) {
  return deriveHasSpace(space) && Number(space.status) === SPACE_STATUS.NORMAL
}

/**
 * 由原始输入推导唯一状态。
 *
 * 安全优先：
 * - 登录态确认失败（authError）或空间状态查询失败（spaceError）时一律进入 ERROR，
 *   不因为“上次有空间”就放行受限 Tab；
 * - 只有在登录态有效且空间状态明确时才可能进入 AUTHENTICATED_WITH_SPACE。
 *
 * @param {{
 *   token?: string,
 *   authError?: string,
 *   space?: object|null,
 *   spaceError?: string,
 * }} input
 * @returns {string} SESSION_STATUS 之一
 */
function deriveSessionStatus(input) {
  const source = input || {}
  const token = typeof source.token === 'string' ? source.token.trim() : ''
  const authError = typeof source.authError === 'string' ? source.authError.trim() : ''
  const spaceError = typeof source.spaceError === 'string' ? source.spaceError.trim() : ''

  if (!token) return SESSION_STATUS.UNAUTHENTICATED
  if (authError) return SESSION_STATUS.ERROR
  if (spaceError) return SESSION_STATUS.ERROR
  return deriveHasSpace(source.space)
    ? SESSION_STATUS.AUTHENTICATED_WITH_SPACE
    : SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE
}

/** 状态是否属于“已登录”（含情侣空间状态暂时无法确认的 ERROR）。 */
function isLoggedInStatus(status) {
  return status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
    || status === SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE
    || status === SESSION_STATUS.ERROR
}

/**
 * 状态分组：
 * - guest：未登录；
 * - logged_in_no_space：已登录但没有可用情侣空间（含查询失败的安全降级）；
 * - logged_in_with_space：已登录且存在情侣空间；
 * - loading：登录态尚未确认。
 */
function bucketOf(status) {
  if (status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) return SESSION_BUCKET.LOGGED_IN_WITH_SPACE
  if (status === SESSION_STATUS.LOADING) return SESSION_STATUS.LOADING
  if (isLoggedInStatus(status)) return SESSION_BUCKET.LOGGED_IN_NO_SPACE
  return SESSION_BUCKET.GUEST
}

/**
 * 当前状态下底部导航应展示的 Tab 标识。
 *
 * 只有 AUTHENTICATED_WITH_SPACE 才返回完整 Tab；
 * loading / unauthenticated / without_space / error 一律只返回
 * 「恋爱广场」+「我的」，因此首帧不可能出现完整 Tab 再收回的闪烁。
 *
 * @returns {string[]}
 */
function resolveVisibleTabIds(status) {
  return status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
    ? FULL_TAB_IDS.slice()
    : MINIMAL_TAB_IDS.slice()
}

/** 按标识取 Tab 定义（含路由与是否依赖情侣空间）。 */
function findTabDefinition(tabId) {
  const target = String(tabId || '')
  return TAB_DEFINITIONS.find(item => item.id === target) || null
}

/** Tab 是否可以点击：依赖情侣空间的 Tab 只在完整状态下可达。 */
function canOpenTab(tabId, status) {
  const tab = findTabDefinition(tabId)
  if (!tab) return false
  if (!tab.requiresSpace) return true
  return status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
}

/** 归一化页面路径：去掉 query / hash 与前导斜杠。 */
function normalizeRoute(route) {
  const raw = typeof route === 'string' ? route.trim() : ''
  if (!raw) return ''
  return raw.split('?')[0].split('#')[0].replace(/^\/+/, '').replace(/\/+$/, '')
}

/**
 * 页面访问级别表。
 *
 * 与 app.json 注册页面一一对应；新增页面时必须在这里声明级别，
 * 否则默认按 AUTH 处理（宁可要求登录，也不要误放行）。
 */
const PAGE_ACCESS_BY_ROUTE = {
  // 公开页面：恋爱广场、广场详情、广场公开故事 / 照片详情、我的、登录页、日志占位
  'pages/plaza/index': PAGE_ACCESS.PUBLIC,
  'pages/plaza-detail/index': PAGE_ACCESS.PUBLIC,
  // 公开内容详情：只看别人的公开快照，匿名访客同样可达；
  // 私密 / 已下架内容由后端公开接口按快照校验拦截，不靠页面权限兜底。
  'pages/plaza-story/plaza-story': PAGE_ACCESS.PUBLIC,
  'pages/plaza-photo/plaza-photo': PAGE_ACCESS.PUBLIC,
  'pages/profile/profile': PAGE_ACCESS.PUBLIC,
  // 登录页必须公开：否则未登录用户会被守卫再次送进登录页，形成死循环。
  'pages/login/login': PAGE_ACCESS.PUBLIC,
  'pages/logs/logs': PAGE_ACCESS.PUBLIC,
  // 只要求登录：资料编辑、情侣空间创建 / 绑定
  'pages/profile-edit/profile-edit': PAGE_ACCESS.AUTH,
  'pages/space-setup/index': PAGE_ACCESS.AUTH,
  // 必须存在情侣空间：项目原有的私密模块
  'pages/index/index': PAGE_ACCESS.SPACE,
  'pages/story/story': PAGE_ACCESS.SPACE,
  'pages/story-detail/story-detail': PAGE_ACCESS.SPACE,
  'pages/photo/photo': PAGE_ACCESS.SPACE,
  'pages/photo-detail/photo-detail': PAGE_ACCESS.SPACE,
  'pages/message/message': PAGE_ACCESS.SPACE,
}

/** 查询页面访问级别；未声明的页面按 AUTH 兜底。 */
function resolvePageAccess(route) {
  const normalized = normalizeRoute(route)
  return PAGE_ACCESS_BY_ROUTE[normalized] || PAGE_ACCESS.AUTH
}

/**
 * 给定状态是否可以访问某个级别的页面。
 *
 * loading 状态一律 false：状态未确认前不放行，由调用方等待或展示骨架。
 */
function canAccessPage(access, status) {
  if (access === PAGE_ACCESS.PUBLIC) return true
  if (status === SESSION_STATUS.LOADING) return false
  if (access === PAGE_ACCESS.SPACE) return status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
  return isLoggedInStatus(status)
}

/**
 * 受限页面被拦截后的跳转目标。
 *
 * - 未登录：回「我的」，由「我的」展示微信登录入口；
 * - 已登录但没有空间 / 状态查询失败：回「我的」，展示创建 / 绑定或重试入口。
 *
 * 统一使用 reLaunch（清空页面栈），避免用户通过返回键回到受限页面。
 */
function resolveAccessRedirect(status) {
  if (status === SESSION_STATUS.UNAUTHENTICATED) {
    return {
      url: `${PROFILE_ROUTE}?guide=login`,
      notice: '登录后才能访问这个页面',
    }
  }
  return {
    url: `${PROFILE_ROUTE}?guide=space`,
    notice: SPACE_REQUIRED_TOAST,
  }
}

module.exports = {
  isValidSpaceId,
  deriveHasSpace,
  isDestroyedSpace,
  isWaitingForPartner,
  isNormalSpace,
  SPACE_DESTROY_ERROR_CODE,
  canShowDestroyEntry,
  canDestroySpace,
  destroyBlockReason,
  isDestroyRejectedByServer,
  deriveSessionStatus,
  isLoggedInStatus,
  bucketOf,
  resolveVisibleTabIds,
  findTabDefinition,
  canOpenTab,
  normalizeRoute,
  PAGE_ACCESS_BY_ROUTE,
  resolvePageAccess,
  canAccessPage,
  resolveAccessRedirect,
}
