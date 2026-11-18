/** utils/space-api.js 的类型声明。 */
import type {
  AcceptInvitationPayload,
  CoupleSpace,
  CreateInvitationResult,
  CreateSpacePayload,
  InvitationPreview,
  SpaceInvitation,
} from '../types/space'

/** 查询情侣空间状态；data=null 表示已登录但没有创建 / 绑定 / 加入任何空间。 */
export function fetchSpaceStatus(): Promise<CoupleSpace | null>
export function createCoupleSpace(payload: CreateSpacePayload): Promise<CoupleSpace>
export function createSpaceInvitation(inviteeAmourId?: string): Promise<CreateInvitationResult>
export function fetchSpaceInvitations(): Promise<SpaceInvitation[]>
export function fetchReceivedInvitations(): Promise<SpaceInvitation[]>
export function previewInvitation(token: string): Promise<InvitationPreview>
export function acceptInvitation(payload: AcceptInvitationPayload): Promise<CoupleSpace>
