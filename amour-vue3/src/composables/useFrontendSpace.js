import { computed, ref, watch } from 'vue'
import { fetchSpaceStatus } from '@/api/space'
import { frontendLoggedIn } from '@/utils/auth'
import {
  SPACE_STATUS,
  deriveSpaceViewMode,
  hasSpaceIdentity,
  isReadySpace,
  isSpaceAuthError,
  readSpaceErrorMessage,
} from '@/utils/spaceState'

/**
 * 全局情侣空间上下文。
 *
 * 设计目标：
 * 1. 整个前台只保留一份 space/status 状态，页面不要各自请求。
 * 2. 不在 localStorage 持久化完整空间对象，避免退出登录或跨窗口切换后展示过期空间。
 * 3. 网络错误只记录 spaceError，不清空登录态，也不贸然清空已有空间状态。
 * 4. 通过 viewMode 给页面提供 plaza / private / unavailable 三种明确模式。
 */

const spaceStatus = ref(null)
const spaceLoading = ref(false)
const spaceError = ref('')

/** 只表示“当前登录用户有一个空间记录”，不要求 status=1。 */
const hasCoupleSpace = computed(() => (
  frontendLoggedIn.value && hasSpaceIdentity(spaceStatus.value)
))

/** spaceId 存在且 status=1，页面才可以进入正常的情侣空间内容。 */
const isSpaceReady = computed(() => (
  hasCoupleSpace.value && isReadySpace(spaceStatus.value)
))

/**
 * 空间处于“等待另一半加入”（status=0）。
 *
 * 这类空间必须能创建与撤销邀请，但不能当作 status=1 的正常空间使用：
 * - 页面不应跳转到故事/相册等正常入口；
 * - 邀请区只在该状态下展示。
 */
const isSpaceWaiting = computed(() => (
  hasCoupleSpace.value && Number(spaceStatus.value?.status) === SPACE_STATUS.WAITING
))

/**
 * 空间状态是否“暂时无法确认”。
 *
 * 网络/服务异常时 spaceStatus 可能仍是 null，但这不是“用户没有空间”。
 * 路由守卫与导航必须据此避免把错误当成 plaza 状态。
 */
const isSpaceStatusUnknown = computed(() => (
  frontendLoggedIn.value && Boolean(spaceError.value) && !hasSpaceIdentity(spaceStatus.value)
))

/**
 * 当前用户是否可以在等待绑定状态下管理邀请。
 *
 * 后端 createInvitation 要求调用者是空间有效成员且空间 status=0，
 * 前端用同一条件控制入口，避免展示必然失败的按钮。
 */
const canManageSpaceInvitations = computed(() => (
  isSpaceWaiting.value && Number(spaceStatus.value?.memberCount ?? 0) < 2
))

/**
 * 页面展示模式：
 * - plaza：未登录，或登录后没有空间记录。
 * - private：已绑定且空间正常。
 * - unavailable：有空间记录，但等待绑定、冻结、归档或异常。
 *
 * 首次登录初始化时 spaceLoading=true 且 spaceStatus 仍为 null，
 * 页面应优先展示加载骨架，不要把加载中的 null 当成“确定没有空间”。
 */
const viewMode = computed(() => (
  deriveSpaceViewMode(frontendLoggedIn.value, spaceStatus.value)
))

// 用递增序号丢弃过期的异步响应：
// 退出登录、跨窗口切换账号、手动 clear 后，旧请求不能再把空间状态写回来。
let requestSequence = 0
let inflightPromise = null
let stopAuthWatcher = null

function handleAuthFailure(message) {
  // 这里只清理空间上下文。登录态由 auth.js 与 axios 的 401 处理器统一维护，
  // 避免网络异常时在这里误调用 clearFrontendSession。
  clearSpaceStatus()
  spaceError.value = typeof message === 'string' && message.trim()
    ? message.trim()
    : '登录状态已失效，请重新登录'
}

/**
 * 清空当前空间上下文，不修改 localStorage 和登录态。
 * 退出登录、账号切换或跨窗口 token 失效时由本模块自动调用。
 */
export function clearSpaceStatus() {
  requestSequence += 1
  inflightPromise = null
  spaceStatus.value = null
  spaceLoading.value = false
  spaceError.value = ''
}

/**
 * 刷新当前登录用户的情侣空间状态。
 *
 * - 未登录：不发请求，直接返回 null。
 * - 重复调用：复用同一个 in-flight Promise，避免页面重复请求。
 * - 网络错误：保留已有 spaceStatus，只写 spaceError，不改变 frontendLoggedIn。
 * - 明确的 401 / 20002：清理空间上下文，登录态交给 axios/auth 处理。
 *
 * @returns {Promise<object|null>}
 */
export function refreshSpaceStatus() {
  if (!frontendLoggedIn.value) {
    clearSpaceStatus()
    return Promise.resolve(null)
  }

  if (inflightPromise) return inflightPromise

  const requestId = ++requestSequence
  spaceLoading.value = true
  spaceError.value = ''

  inflightPromise = Promise.resolve()
    .then(() => {
      // 如果请求还没发出就退出登录/切换账号，直接跳过网络调用，满足“未登录不请求”。
      if (requestId !== requestSequence || !frontendLoggedIn.value) return null
      return fetchSpaceStatus()
    })
    .then((response) => {
      if (requestId !== requestSequence || !frontendLoggedIn.value) {
        return spaceStatus.value
      }

      const data = response?.data
      if (!data?.success) {
        if (String(data?.errorCode ?? '') === '20002') {
          handleAuthFailure(data?.message)
          return null
        }
        // 业务失败但并非登录失效：保留旧空间状态，页面可通过 spaceError 展示重试提示。
        spaceError.value = (typeof data?.message === 'string' && data.message.trim())
          ? data.message.trim()
          : '情侣空间状态加载失败'
        return spaceStatus.value
      }

      // data=null 表示已登录但尚未创建/绑定空间；不能伪造一个空对象。
      spaceStatus.value = data.data && typeof data.data === 'object' ? data.data : null
      return spaceStatus.value
    })
    .catch((error) => {
      if (requestId !== requestSequence) return spaceStatus.value

      if (isSpaceAuthError(error)) {
        handleAuthFailure(error?.response?.data?.message)
        return null
      }

      // 网络断开、超时、5xx 等：保留已有空间与登录态，绝不在这里误判为退出登录。
      spaceError.value = readSpaceErrorMessage(error)
      return spaceStatus.value
    })
    .finally(() => {
      if (requestId === requestSequence) {
        spaceLoading.value = false
        inflightPromise = null
      }
    })

  return inflightPromise
}

/**
 * 登录态变化时自动同步：
 * - 登录成功：立即刷新空间状态。
 * - 退出登录：同步清空空间状态，避免残留旧空间。
 *
 * flush: 'sync' 保证路由/页面在登录态变化的同一轮渲染里就能看到 cleared 状态。
 */
stopAuthWatcher = watch(
  frontendLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      refreshSpaceStatus()
    } else {
      clearSpaceStatus()
    }
  },
  { immediate: true, flush: 'sync' },
)

/**
 * 跨窗口同步：auth.js 只同步 frontendLoggedIn 的布尔值，
 * 当两个窗口切换不同账号时，token 变了但布尔值可能仍为 true。
 * 因此这里额外监听 amour_token，先清空旧空间，再按新 token 刷新。
 */
function handleStorageTokenChange(event) {
  // key=null 代表其他窗口执行了 localStorage.clear()，也要清掉空间上下文。
  if (event.key !== 'amour_token' && event.key !== null) return
  clearSpaceStatus()
  if (event.key === 'amour_token' && event.newValue && frontendLoggedIn.value) {
    refreshSpaceStatus()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageTokenChange)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopAuthWatcher?.()
    stopAuthWatcher = null
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageTokenChange)
    }
  })
}

/**
 * 组合式函数入口。所有组件共享同一份模块级状态，重复调用不会产生多份缓存。
 *
 * 页面用法示例：
 * const { viewMode, spaceLoading, spaceStatus, spaceError, refreshSpaceStatus } = useFrontendSpace()
 * if (spaceLoading && !spaceStatus) return // 首次加载成功前渲染骨架，避免 plaza/private 文案闪动
 * if (spaceError && !spaceStatus) return // 网络异常时展示 spaceError，并允许 refreshSpaceStatus()
 * if (viewMode === 'private') { ... }
 * if (viewMode === 'unavailable') {
 *   // spaceStatus.status 为 0/2/3 时分别展示等待绑定、冻结、归档提示。
 * }
 *
 * 测试示例（详见 useFrontendSpace.test.mjs）：
 * - 未登录 refreshSpaceStatus 不发起请求。
 * - data=null -> hasCoupleSpace=false, viewMode='plaza'。
 * - status=1 -> private；status=0/2/3 -> unavailable。
 * - 网络错误 -> 保留 spaceStatus，只写 spaceError，不改变登录态。
 */
export function useFrontendSpace() {
  return {
    spaceStatus,
    spaceLoading,
    spaceError,
    hasCoupleSpace,
    isSpaceReady,
    isSpaceWaiting,
    canManageSpaceInvitations,
    isSpaceStatusUnknown,
    viewMode,
    refreshSpaceStatus,
    clearSpaceStatus,
  }
}

export {
  spaceStatus,
  spaceLoading,
  spaceError,
  hasCoupleSpace,
  isSpaceReady,
  isSpaceWaiting,
  canManageSpaceInvitations,
  isSpaceStatusUnknown,
  viewMode,
}

export default useFrontendSpace
