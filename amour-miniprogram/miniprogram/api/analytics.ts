/**
 * 页面浏览采集接口。
 *
 * 复用 utils/request 的 post：token 注入、baseURL 候选、超时与 401 处理都在请求层完成，
 * 本文件不重复实现这些逻辑，也不读取 token。
 *
 * 采集请求是 fire-and-forget：调用方不需要等待，也不要在失败时提示用户。
 * 渠道（clientType）为小程序端固定的 'miniprogram'，服务端会按白名单校验；
 * 它只是统计维度，不参与鉴权或权限判断。
 */
import { post } from '../utils/request'

export type PageViewClientType = 'web' | 'miniprogram'

export interface PageViewEventPayload {
  /** 白名单页面键，例如 home / plaza / plaza_detail。 */
  pageKey: string
  /** 小程序本地生成的 32 位十六进制访客 ID。 */
  visitorId: string
  /** 客户端幂等键：同一次页面展示重复提交只计一次。 */
  eventId: string
  /** 渠道标识，小程序端固定为 miniprogram。 */
  clientType: PageViewClientType
}

export const PAGE_VIEW_ENDPOINT = '/analytics/page-view'

export function reportPageView(payload: PageViewEventPayload): Promise<void> {
  return post<void>(PAGE_VIEW_ENDPOINT, payload)
}
