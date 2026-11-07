package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.AcceptInvitationReqVO;
import com.chengliuxiang.amour.web.model.vo.space.CreateInvitationReqVO;
import com.chengliuxiang.amour.web.model.vo.space.CreateInvitationRspVO;
import com.chengliuxiang.amour.web.model.vo.space.CreateSpaceReqVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationIdReqVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationPreviewVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationTokenReqVO;
import com.chengliuxiang.amour.web.model.vo.space.InvitationVO;
import com.chengliuxiang.amour.web.model.vo.space.RestoreConfirmVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceStatusVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceVisibilityReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceVisibilityVO;
import com.chengliuxiang.amour.web.model.vo.space.UnbindStatusVO;

import java.util.List;

public interface SpaceService {

    /**
     * 创建情侣空间，创建者自动成为空间发起人。
     */
    Response<SpaceStatusVO> createSpace(CreateSpaceReqVO reqVO);

    /**
     * 查看当前登录用户所在空间的状态，未加入空间时返回空数据。
     */
    Response<SpaceStatusVO> getCurrentSpace();

    /**
     * 创建邀请，可指定受邀用户或创建链接邀请。
     */
    Response<CreateInvitationRspVO> createInvitation(CreateInvitationReqVO reqVO);

    /**
     * 查看当前空间内待接受的邀请。
     */
    Response<List<InvitationVO>> listSpaceInvitations();

    /**
     * 查看当前登录用户收到的待接受邀请。
     */
    Response<List<InvitationVO>> listReceivedInvitations();

    /**
     * 撤销当前空间内的待接受邀请。
     */
    Response<Void> revokeInvitation(InvitationIdReqVO reqVO);

    /**
     * 通过令牌预览邀请详情，无需登录。
     */
    Response<InvitationPreviewVO> previewInvitation(InvitationTokenReqVO reqVO);

    /**
     * 接受邀请并加入空间。可通过邀请令牌或指定给当前用户的邀请 ID 接受。
     */
    Response<SpaceStatusVO> acceptInvitation(AcceptInvitationReqVO reqVO);

    /**
     * 冻结当前空间，冻结后暂停使用，需要双方确认恢复。
     */
    Response<Void> freezeSpace();

    /**
     * 确认恢复冻结或归档的空间，双方均确认后恢复为正常状态。
     */
    Response<RestoreConfirmVO> confirmRestore();

    /**
     * 兼容旧前端的「退出」入口：不再单方立即退出，而是改为发起解绑申请。
     */
    Response<UnbindStatusVO> leaveSpace();

    /**
     * 发起解绑申请。申请创建后成员关系与空间状态保持不变，需另一方确认后才生效。
     */
    Response<UnbindStatusVO> requestUnbind();

    /**
     * 发起人取消自己发起的解绑申请。成员关系与空间状态不变。
     */
    Response<UnbindStatusVO> cancelUnbind();

    /**
     * 另一名有效成员拒绝解绑申请。成员关系与空间状态不变。
     */
    Response<UnbindStatusVO> rejectUnbind();

    /**
     * 另一名有效成员确认解绑：双方退出，空间进入 status=5（已解绑/逻辑删除），内容全部保留。
     */
    Response<UnbindStatusVO> confirmUnbind();

    /**
     * 设置当前空间是否公开到恋爱广场。
     */
    Response<SpaceVisibilityVO> updateVisibility(SpaceVisibilityReqVO reqVO);
}
