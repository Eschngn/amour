export class ApiError extends Error {
  statusCode: number
  errorCode: string
}

export function post<T>(path: string, data?: WechatMiniprogram.IAnyObject): Promise<T>
