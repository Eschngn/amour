export interface AuthSession {
  token: string
  username: string
  displayName: string
  avatar: string
}

export function getStoredAuth(): AuthSession
export function clearAuth(): void
export function ensureWechatLogin(options?: { force?: boolean }): Promise<AuthSession>
export function logoutWechat(): Promise<void>
