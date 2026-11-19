/** utils/access-control.js 的类型声明。 */
import type { SessionStatus } from './session-constants'
import type { SpaceSetupAction } from './space-setup-route'

export interface GuardOptions {
  /** 不弹 toast（首屏自动拦截时使用） */
  silent?: boolean
}

export interface NavigateOptions extends GuardOptions {
  toastText?: string
}

/** 页面访问检查；返回是否放行。 */
export function guardPage(route?: string, options?: GuardOptions): boolean
/** 等待状态确认后再判断。 */
export function guardPageReady(route?: string, options?: GuardOptions): Promise<boolean>
/** 导航前权限检查。 */
export function canNavigate(url: string, options?: NavigateOptions): boolean
/** 带守卫的 navigateTo。 */
export function navigateWithGuard(url: string, options?: NavigateOptions): boolean
/** 带守卫的 redirectTo。 */
export function redirectWithGuard(url: string, options?: NavigateOptions): boolean
/** 受限页面统一落点：我的（带 guide 参数）。 */
export function redirectToGuidedProfile(
  status: SessionStatus | string,
  options?: GuardOptions,
): { url: string; notice: string }
/** 跳转登录页。 */
export function redirectToLogin(redirectPath?: string): void
/** 打开情侣空间页；返回是否已发起跳转。 */
export function openSpaceSetup(action?: SpaceSetupAction): boolean
/** 打开空间内容编辑工作台；返回是否已发起跳转。 */
export function openSpaceStudio(): boolean
/** 全局导航守卫：绑定一次，处理“停留期间状态变化 / 历史栈恢复”的拦截。 */
export function bindSessionNavigationGuard(): () => void
/** 当前页面栈顶路由。 */
export function resolveCurrentRoute(): string
