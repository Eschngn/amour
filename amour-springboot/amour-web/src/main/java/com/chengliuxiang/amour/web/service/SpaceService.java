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
     * 归档当前空间，归档后需要双方确认恢复。
     */
    Response<Void> archiveSpace();

    /**
     * 确认恢复冻结或归档的空间，双方均确认后恢复为正常状态。
     */
    Response<RestoreConfirmVO> confirmRestore();
}
