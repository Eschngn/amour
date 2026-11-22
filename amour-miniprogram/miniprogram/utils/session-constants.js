/**
 * 登录态 / 情侣空间状态 / Tab / 页面权限的统一常量。
 *
 * 为什么单独一个文件：
 * - 状态字符串、Tab 标识、页面权限标识散落在各页面时，最容易出现「某页面少判断一个状态」；
 * - 这里只放常量与纯数据表，不依赖 wx、不发起请求，测试与页面都可以安全引用；
 * - 新增 Tab 或页面时只改这里，bottom-nav、路由守卫、页面守卫共用同一份定义。
 *
 * 小程序是 CommonJS 运行时，页面以 require 引入；测试侧同时提供 .d.ts 保证类型完整。
 */

/** 用户状态（唯一状态源：utils/session-state.js 维护）。 */
const SESSION_STATUS = {
  /** 正在恢复登录态或查询情侣空间状态；确认前不允许渲染完整 Tab。 */
  LOADING: 'loading',
  /** 未登录：只展示「恋爱广场」和「我的」。 */
  UNAUTHENTICATED: 'unauthenticated',
  /** 已登录但没有情侣空间：只展示「恋爱广场」和「我的」。 */
  AUTHENTICATED_WITHOUT_SPACE: 'authenticated_without_space',
  /** 已登录且已创建 / 绑定 / 加入情侣空间：展示完整 Tab。 */
  AUTHENTICATED_WITH_SPACE: 'authenticated_with_space',
  /** 情侣空间状态查询失败：按安全策略降级为两个 Tab，并提供重试。 */
  ERROR: 'error',
}

/** 全部状态值，便于测试与校验。 */
const SESSION_STATUS_LIST = Object.freeze([
  SESSION_STATUS.LOADING,
  SESSION_STATUS.UNAUTHENTICATED,
  SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE,
  SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
  SESSION_STATUS.ERROR,
])

/**
 * 状态归属：
 * - 未登录 / 登录中；
 * - 已登录但没有可用情侣空间（含查询失败的安全降级）；
 * - 已登录且有情侣空间。
 */
const SESSION_BUCKET = Object.freeze({
  GUEST: 'guest',
  LOGGED_IN_NO_SPACE: 'logged_in_no_space',
  LOGGED_IN_WITH_SPACE: 'logged_in_with_space',
})

/**
 * 后端情侣空间状态码（SpaceStatusVO.status）。
 * 与 amour-springboot SpaceServiceImpl 保持一致：
 * 0-等待绑定 1-正常 2-冻结 3-历史归档 4-删除等待期 5-已解绑（逻辑删除）。
 */
const SPACE_STATUS = Object.freeze({
  WAITING: 0,
  NORMAL: 1,
  FROZEN: 2,
  ARCHIVED: 3,
  DELETING: 4,
  DELETED: 5,
  /** 创建者在另一半加入前销毁：普通用户不可见、不可访问，仅管理员可从留档恢复。 */
  DESTROYED: 6,
})

/**
 * Tab 标识。这里的值同时是 bottom-nav 的 data-page 与页面 current 属性值。
 *
 * plaza / profile 是公开入口，任何状态都展示；
 * index / story / photo / message 依赖情侣空间，只在完整 Tab 下展示。
 */
const TAB_ID = Object.freeze({
  PLAZA: 'plaza',
  HOME: 'home',
  STORY: 'story',
  PHOTO: 'photo',
  MESSAGE: 'message',
  PROFILE: 'profile',
})

/**
 * Tab 定义表：唯一的一份 Tab 顺序、路由与「是否依赖情侣空间」声明。
 * 顺序 = 底部导航从左到右的渲染顺序（品牌入口固定居中，见 bottom-nav）。
 */
const TAB_DEFINITIONS = Object.freeze([
  { id: TAB_ID.PLAZA, label: '广场', route: '/pages/plaza/index', requiresSpace: false, requiresAuth: false },
  { id: TAB_ID.STORY, label: '故事', route: '/pages/story/story', requiresSpace: true, requiresAuth: true, module: 'story' },
  { id: TAB_ID.PHOTO, label: '相册', route: '/pages/photo/photo', requiresSpace: true, requiresAuth: true, module: 'photo' },
  { id: TAB_ID.HOME, label: '首页', route: '/pages/index/index', requiresSpace: true, requiresAuth: true },
  { id: TAB_ID.MESSAGE, label: '留言', route: '/pages/message/message', requiresSpace: true, requiresAuth: true, module: 'message' },
  { id: TAB_ID.PROFILE, label: '我的', route: '/pages/profile/profile', requiresSpace: false, requiresAuth: false },
])

/** 任意状态下都保留的最小 Tab 集合（需求：仅「恋爱广场」与「我的」）。 */
const MINIMAL_TAB_IDS = Object.freeze([TAB_ID.PLAZA, TAB_ID.PROFILE])

/** 已登录且存在情侣空间时展示的完整 Tab 集合。 */
const FULL_TAB_IDS = Object.freeze(TAB_DEFINITIONS.map(item => item.id))

/**
 * 页面访问级别。
 * - public：恋爱广场、登录、我的等公开页；
 * - auth：只要求登录；
 * - space：必须已登录且存在情侣空间。
 */
const PAGE_ACCESS = Object.freeze({
  PUBLIC: 'public',
  AUTH: 'auth',
  SPACE: 'space',
})

/** 登录页路由（未登录访问受限页时的统一落点之一）。 */
const LOGIN_ROUTE = '/pages/login/login'
/** 「我的」页路由：未登录 / 无情侣空间时受限页的兜底落点。 */
const PROFILE_ROUTE = '/pages/profile/profile'
/** 恋爱广场路由：最安全的公开兜底。 */
const PLAZA_ROUTE = '/pages/plaza/index'
/** 情侣空间创建 / 绑定页路由。 */
const SPACE_SETUP_ROUTE = '/pages/space-setup/index'
/** 情侣空间首页（完整 Tab 的首屏）。 */
const SPACE_HOME_ROUTE = '/pages/index/index'
/** 空间内容编辑工作台（首页 / 故事 / 留言 / 相册 / 纪念日）。 */
const SPACE_STUDIO_ROUTE = '/pages/space-studio/index'

/** 本地缓存键：用户主动退出登录标记（为 true 时启动不做静默微信登录）。 */
const LOGGED_OUT_KEY = 'amour_logged_out'

/** 关键状态切换的日志前缀：沿用项目现有的 console 记录方式，统一前缀便于检索。 */
const SESSION_LOG_PREFIX = '[session]'

/** 情侣空间状态查询失败时的默认文案。 */
const SPACE_STATUS_ERROR_MESSAGE = '情侣空间状态加载失败，请稍后重试'

/** 未登录 / 无情侣空间时，受限 Tab 被拦截的提示文案。 */
const SPACE_REQUIRED_TOAST = '创建或绑定情侣空间后才能使用这个功能'

module.exports = {
  SESSION_STATUS,
  SESSION_STATUS_LIST,
  SESSION_BUCKET,
  SPACE_STATUS,
  TAB_ID,
  TAB_DEFINITIONS,
  MINIMAL_TAB_IDS,
  FULL_TAB_IDS,
  PAGE_ACCESS,
  LOGIN_ROUTE,
  PROFILE_ROUTE,
  PLAZA_ROUTE,
  SPACE_SETUP_ROUTE,
  SPACE_HOME_ROUTE,
  SPACE_STUDIO_ROUTE,
  LOGGED_OUT_KEY,
  SESSION_LOG_PREFIX,
  SPACE_STATUS_ERROR_MESSAGE,
  SPACE_REQUIRED_TOAST,
}
