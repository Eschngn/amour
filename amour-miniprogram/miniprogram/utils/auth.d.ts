export interface AuthSession {
  token: string
  username: string
  displayName: string
  avatar: string
  passwordSet: boolean
}

export function getStoredAuth(): AuthSession
export function clearAuth(): void
export function ensureWechatLogin(options?: { force?: boolean; forceValidation?: boolean }): Promise<AuthSession>
export function logoutWechat(): Promise<void>
export function updateStoredProfile(profile?: Partial<AuthSession>): AuthSession
