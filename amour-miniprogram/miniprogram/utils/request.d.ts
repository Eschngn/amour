export class ApiError extends Error {
  statusCode: number
  errorCode: string
}

export function post<T>(path: string, data?: WechatMiniprogram.IAnyObject): Promise<T>
export function uploadFile<T>(path: string, filePath: string, name?: string): Promise<T>
