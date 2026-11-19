/** utils/session-constants.js 的类型声明。 */

export type SessionStatus =
  | 'loading'
  | 'unauthenticated'
  | 'authenticated_without_space'
  | 'authenticated_with_space'
  | 'error'

export type SessionBucket = 'guest' | 'logged_in_no_space' | 'logged_in_with_space'

export type TabId = 'plaza' | 'home' | 'story' | 'photo' | 'message' | 'profile'

export type PageAccess = 'public' | 'auth' | 'space'

export interface TabDefinition {
  id: TabId
  label: string
  route: string
  requiresSpace: boolean
  requiresAuth: boolean
  module?: string
}

export const SESSION_STATUS: {
  LOADING: 'loading'
  UNAUTHENTICATED: 'unauthenticated'
  AUTHENTICATED_WITHOUT_SPACE: 'authenticated_without_space'
  AUTHENTICATED_WITH_SPACE: 'authenticated_with_space'
  ERROR: 'error'
}

export const SESSION_STATUS_LIST: ReadonlyArray<SessionStatus>

export const SESSION_BUCKET: {
  GUEST: 'guest'
  LOGGED_IN_NO_SPACE: 'logged_in_no_space'
  LOGGED_IN_WITH_SPACE: 'logged_in_with_space'
}

export const SPACE_STATUS: {
  WAITING: 0
  NORMAL: 1
  FROZEN: 2
  ARCHIVED: 3
  DELETING: 4
  DELETED: 5
  DESTROYED: 6
}

export const TAB_ID: {
  PLAZA: 'plaza'
  HOME: 'home'
  STORY: 'story'
  PHOTO: 'photo'
  MESSAGE: 'message'
  PROFILE: 'profile'
}

export const TAB_DEFINITIONS: ReadonlyArray<TabDefinition>
export const MINIMAL_TAB_IDS: ReadonlyArray<TabId>
export const FULL_TAB_IDS: ReadonlyArray<TabId>

export const PAGE_ACCESS: {
  PUBLIC: 'public'
  AUTH: 'auth'
  SPACE: 'space'
}

export const LOGIN_ROUTE: string
export const PROFILE_ROUTE: string
export const PLAZA_ROUTE: string
export const SPACE_SETUP_ROUTE: string
export const SPACE_HOME_ROUTE: string
export const SPACE_STUDIO_ROUTE: string
export const LOGGED_OUT_KEY: string
export const SESSION_LOG_PREFIX: string
export const SPACE_STATUS_ERROR_MESSAGE: string
export const SPACE_REQUIRED_TOAST: string
