export interface AuthSession {
  token: string
  username: string
  displayName: string
  avatar: string
  passwordSet: boolean
  permissions: string[]
}

export function hasFrontendQueryPermission(module: string): boolean

export function getStoredAuth(): AuthSession
export function clearAuth(): void
export function ensureWechatLogin(options?: { force?: boolean; forceValidation?: boolean }): Promise<AuthSession>
export function logoutWechat(): Promise<void>
export function updateStoredProfile(profile?: Partial<AuthSession>): AuthSession
/** 订阅登录态被清理事件（token 失效 / 退出登录）；返回取消订阅函数。 */
export function onAuthCleared(listener: () => void): () => void
