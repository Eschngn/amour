export interface SpaceHomePhoto {
  key: string
  url: string
}

export interface SpaceHomeView {
  spaceName: string
  /** 空间简介；空字符串表示未填写，由页面展示简短占位 */
  description: string
  /** 服务端判断的当前用户是否可编辑空间首页 */
  canEdit: boolean
  boyName: string
  girlName: string
  boyAvatar: string
  girlAvatar: string
  heroPhotoOne: string
  heroPhotoTwo: string
  /** 只包含真实存在的照片地址（0～2 张） */
  heroPhotos: SpaceHomePhoto[]
  loveStartTime: string
  loveStartDate: string
  /** 是否已设置恋爱开始时间：未设置时页面不能把 0 天当作真实数据 */
  hasLoveStart: boolean
  boyInitial: string
  girlInitial: string
}

export function buildHomeView(home: Record<string, unknown> | null | undefined): SpaceHomeView
export function formatLoveStartDate(value: unknown): string
export function initialOf(name: unknown, fallback: string): string
