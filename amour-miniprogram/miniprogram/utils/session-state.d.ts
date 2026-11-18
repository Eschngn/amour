/** utils/session-state.js 的类型声明。 */
import type { AuthSession } from './auth'
import type { CoupleSpace } from '../types/space'
import type { SessionStatus } from './session-constants'

export interface SessionSnapshot {
  status: SessionStatus
  auth: AuthSession | null
  space: Partial<CoupleSpace> | null
  spaceError: string
  authError: string
  /** 是否已完成至少一次状态确认 */
  confirmed: boolean
  /** 用户是否主动退出登录（为 true 时不做静默微信登录） */
  loggedOut: boolean
  loggedIn: boolean
  hasSpace: boolean
  loading: boolean
  token: string
}

export type SessionListener = (snapshot: SessionSnapshot) => void

/** 当前状态快照（调用方拿到的是副本）。 */
export function getSnapshot(): SessionSnapshot
/** 订阅状态变化；返回取消订阅函数。订阅时会立即回调一次。 */
export function subscribe(listener: SessionListener): () => void
/** 等待状态确认（启动时使用）。 */
export function ensureSessionReady(): Promise<SessionSnapshot>
/** 恢复登录态并确认情侣空间状态。 */
export function refreshSession(options?: {
  force?: boolean
  forceValidation?: boolean
  reason?: string
}): Promise<SessionSnapshot>
/** 显式登录（我的页面点击登录）：强制重新走一次微信登录并刷新空间状态。 */
export function loginSession(): Promise<SessionSnapshot>
/** 查询情侣空间状态；force=true 时丢弃在途请求。 */
export function refreshSpaceStatus(options?: {
  force?: boolean
  reason?: string
}): Promise<Partial<CoupleSpace> | null>
/** 创建 / 绑定成功后的强制刷新。 */
export function refreshAfterSpaceChange(reason?: string): Promise<Partial<CoupleSpace> | null>
/** 登录成功统一入口：写入会话并刷新空间状态。 */
export function notifyLoginSuccess(session: AuthSession): Promise<SessionSnapshot>
/** 退出登录：清理缓存与全局状态。 */
export function logoutSession(): Promise<SessionSnapshot>
/** 登录态失效时收敛状态（请求层 401 也会触发）。 */
export function handleAuthCleared(reason?: string): void
/** 清理情侣空间相关本地缓存。 */
export function clearSessionCache(): void
/** 仅供测试。 */
export function resetForTests(): void

export const SESSION_STATUS: {
  LOADING: 'loading'
  UNAUTHENTICATED: 'unauthenticated'
  AUTHENTICATED_WITHOUT_SPACE: 'authenticated_without_space'
  AUTHENTICATED_WITH_SPACE: 'authenticated_with_space'
  ERROR: 'error'
}
