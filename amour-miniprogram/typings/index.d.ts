/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    auth?: AuthSession,
    authReady?: Promise<AuthSession>,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}

interface AuthSession {
  token: string
  username: string
  displayName: string
  avatar: string
}
