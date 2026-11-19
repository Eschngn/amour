/** utils/space-setup-route.js 的类型声明。 */

/** 情侣空间页视图模式；'' 表示默认的创建 / 绑定页面。 */
export type SpaceSetupMode = '' | 'create' | 'bind' | 'settings'

/** 进入情侣空间页的入口动作。 */
export type SpaceSetupAction = SpaceSetupMode

export const SPACE_SETUP_MODE: {
  NONE: ''
  CREATE: 'create'
  BIND: 'bind'
  SETTINGS: 'settings'
}

export interface ParsedSpaceSetupQuery {
  /** 最终视图模式（mode 优先于 action）。 */
  mode: SpaceSetupMode
  /** query 中显式给出的 action（'' 表示未给出）。 */
  action: SpaceSetupMode
  /** 是否为「空间设置」模式。 */
  isSettings: boolean
}

/** 规范化入口参数；非法值返回 ''。 */
export function normalizeSpaceSetupAction(action?: unknown): SpaceSetupMode
/** 生成情侣空间页地址（create / bind 带 ?action=，settings 带 ?mode=settings）。 */
export function buildSpaceSetupUrl(action?: SpaceSetupAction | string): string
/** 解析页面 onLoad 的 query。 */
export function parseSpaceSetupQuery(
  query?: Record<string, unknown> | null,
): ParsedSpaceSetupQuery
