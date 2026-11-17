export class ApiError extends Error {
  statusCode: number
  errorCode: string
  /** 该错误对应的接口地址，便于排查环境配置 */
  baseUrl?: string
  /** 连接失败时记录实际尝试过的地址 */
  attempts?: string[]
  isNetworkError?: boolean
}

export function post<T>(path: string, data?: WechatMiniprogram.IAnyObject): Promise<T>
export function uploadFile<T>(path: string, filePath: string, name?: string): Promise<T>
export function getApiBaseUrl(): string
export function getApiBaseUrlCandidates(): string[]
