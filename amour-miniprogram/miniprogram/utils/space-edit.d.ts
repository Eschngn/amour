/** utils/space-edit.js 的类型声明。 */
import type { CoupleSpace } from '../types/space'

/** 与后端 UpdateSpaceReqVO 的长度限制一致。 */
export const SPACE_INFO_NAME_MAX: number
export const SPACE_INFO_DESCRIPTION_MAX: number

export const SPACE_UPDATE_ERROR_CODE: Readonly<{
  NOT_ALLOWED: string
  NOT_MEMBER: string
  UNBOUND: string
  TARGET_CHANGED: string
}>

/** 保存成功、仅全局状态同步失败时的提示文案。 */
export const SPACE_INFO_SYNC_ERROR_MESSAGE: string

/** 拆字段后的时间（不经过 Date 解析字符串）。 */
export interface SpaceDateTimeFields {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

/** 编辑表单草稿（picker 拆成日期 + 时间两个值）。 */
export interface SpaceInfoDraft {
  spaceName: string
  description: string
  /** yyyy-MM-dd；空表示未设置 */
  loveDate: string
  /** HH:mm；空表示未设置 */
  loveTime: string
}

/** 编辑基线：服务端最近一次确认的空间基础信息。 */
export interface SpaceInfoBaseline {
  spaceId: number | string | ''
  spaceName: string
  description: string
  /** yyyy-MM-dd HH:mm:ss；空表示未设置 */
  loveStartTime: string
}

/** 只读摘要（含展示用格式化时间）。 */
export interface SpaceInfoSummary {
  spaceName: string
  description: string
  loveStartTime: string
  loveStartTimeText: string
}

/** /space/update 请求体：三字段始终显式提交。 */
export interface SpaceInfoUpdatePayload {
  spaceName: string
  description: string
  /** yyyy-MM-dd HH:mm:ss 或 null（清空），绝不为空字符串 */
  loveStartTime: string | null
}

export function parseBackendDateTime(
  value: string | Date | null | undefined,
): SpaceDateTimeFields | null
export function formatLoveStartTime(value: string | Date | null | undefined): string
export function splitLoveStartTime(
  value: string | Date | null | undefined,
): { date: string; time: string }
export function normalizeLoveStartTimePayload(
  value: string | Date | null | undefined,
): string | null
export function todayLocalDate(now?: Date): string
export function composeLoveStartTime(
  draft: Partial<SpaceInfoDraft> | null | undefined,
  baselineLoveStartTime?: string | null,
): string | null
export function buildSpaceInfoBaseline(
  space: Partial<CoupleSpace> | null | undefined,
): SpaceInfoBaseline
export function describeSpaceInfo(
  space: Partial<CoupleSpace> | null | undefined,
): SpaceInfoSummary
export function buildSpaceInfoDraft(
  baseline: Partial<SpaceInfoBaseline> | null | undefined,
): SpaceInfoDraft
export function measureText(value: unknown): number
export function isSpaceInfoDirty(
  draft: Partial<SpaceInfoDraft> | null | undefined,
  baseline: Partial<SpaceInfoBaseline> | null | undefined,
): boolean
export function buildSpaceInfoUpdatePayload(
  draft: Partial<SpaceInfoDraft> | null | undefined,
  baseline: Partial<SpaceInfoBaseline> | null | undefined,
): SpaceInfoUpdatePayload
export function buildSpaceInfoValidationError(
  draft: Partial<SpaceInfoDraft> | null | undefined,
): string
export function canEditSpaceInfo(space: Partial<CoupleSpace> | null | undefined): boolean
export function isSpaceInfoUpdateConflict(error: { errorCode?: string } | null | undefined): boolean
export function buildSpaceInfoErrorMessage(
  error: { errorCode?: string; message?: string } | null | undefined,
  fallback?: string,
): string
