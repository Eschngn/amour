/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    auth?: AuthSession,
    authReady?: Promise<AuthSession | undefined>,
    /** 当前会话状态快照（utils/session-state），仅供调试与兜底读取 */
    session?: import('../miniprogram/utils/session-state').SessionSnapshot,
    /** 订阅取消句柄 */
    sessionUnsubscribe?: () => void,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
  /** 显式刷新一次登录态与情侣空间状态 */
  refreshSession?: (force?: boolean) => Promise<unknown>,
}

interface AuthSession {
  token: string
  username: string
  displayName: string
  avatar: string
  passwordSet?: boolean
  permissions?: string[]
}
