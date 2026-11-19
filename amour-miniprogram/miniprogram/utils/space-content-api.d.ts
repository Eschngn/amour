export function querySpaceHome(): Promise<Record<string, unknown>>
export function saveSpaceHome(payload: Record<string, unknown>): Promise<Record<string, unknown>>
export function uploadSpaceImage(filePath: string): Promise<string>
export function fetchSpaceReviewStatus(): Promise<Record<string, unknown>>
export function resubmitSpaceReview(): Promise<Record<string, unknown>>
