/** utils/session-rules.js 的类型声明。 */
import type { CoupleSpace } from '../types/space'
import type { PageAccess, SessionBucket, SessionStatus, TabDefinition, TabId } from './session-constants'

export interface SessionRuleInput {
  token?: string
  authError?: string
  space?: Partial<CoupleSpace> | null
  spaceError?: string
}

export interface AccessRedirect {
  url: string
  notice: string
}

export function isValidSpaceId(spaceId: unknown): boolean
export function deriveHasSpace(space: Partial<CoupleSpace> | null | undefined): boolean
export function isWaitingForPartner(space: Partial<CoupleSpace> | null | undefined): boolean
export function isNormalSpace(space: Partial<CoupleSpace> | null | undefined): boolean
export function deriveSessionStatus(input: SessionRuleInput): SessionStatus
export function isLoggedInStatus(status: SessionStatus | string): boolean
export function bucketOf(status: SessionStatus | string): SessionBucket | 'loading'
export function resolveVisibleTabIds(status: SessionStatus | string): TabId[]
export function findTabDefinition(tabId: TabId | string): TabDefinition | null
export function canOpenTab(tabId: TabId | string, status: SessionStatus | string): boolean
export function normalizeRoute(route: string | null | undefined): string
export const PAGE_ACCESS_BY_ROUTE: Record<string, PageAccess>
export function resolvePageAccess(route: string | null | undefined): PageAccess
export function canAccessPage(access: PageAccess, status: SessionStatus | string): boolean
export function resolveAccessRedirect(status: SessionStatus | string): AccessRedirect
