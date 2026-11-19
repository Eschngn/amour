/** utils/space-api.js 的类型声明。 */
import type {
  AcceptInvitationPayload,
  CoupleSpace,
  CreateInvitationResult,
  CreateSpacePayload,
  InvitationPreview,
  SpaceDestroyResult,
  SpaceInvitation,
  UpdateSpacePayload,
  UpdateSpaceResult,
} from '../types/space'

/** 查询情侣空间状态；data=null 表示已登录但没有创建 / 绑定 / 加入任何空间。 */
export function fetchSpaceStatus(): Promise<CoupleSpace | null>
export function createCoupleSpace(payload: CreateSpacePayload): Promise<CoupleSpace>
/**
 * 编辑空间基础信息（POST /space/update）。
 *
 * 三字段始终显式提交：spaceName / description 传 trim 后字符串（空串也提交），
 * loveStartTime 传 `yyyy-MM-dd HH:mm:ss` 或 null（清空），绝不为空字符串。
 */
export function updateCoupleSpace(payload: UpdateSpacePayload): Promise<UpdateSpaceResult>
export function createSpaceInvitation(inviteeAmourId?: string): Promise<CreateInvitationResult>
export function fetchSpaceInvitations(): Promise<SpaceInvitation[]>
export function fetchReceivedInvitations(): Promise<SpaceInvitation[]>
export function previewInvitation(token: string): Promise<InvitationPreview>
export function acceptInvitation(payload: AcceptInvitationPayload): Promise<CoupleSpace>
/** 创建者在另一半未加入时销毁空间；已销毁时幂等返回同一份结果（destroyed=false）。 */
export function destroyCoupleSpace(
  space?: Partial<Pick<CoupleSpace, 'spaceId'>> | null,
): Promise<SpaceDestroyResult>
