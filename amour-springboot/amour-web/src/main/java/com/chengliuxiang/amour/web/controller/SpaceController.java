package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
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
import com.chengliuxiang.amour.web.model.vo.space.UpdateSpaceReqVO;
import com.chengliuxiang.amour.web.service.SpaceService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/space")
public class SpaceController {

    @Resource
    private SpaceService spaceService;

    @ApiOperationLog(description = "创建情侣空间")
    @PostMapping("/create")
    public Response<SpaceStatusVO> createSpace(@Valid @RequestBody CreateSpaceReqVO reqVO) {
        return spaceService.createSpace(reqVO);
    }

    @ApiOperationLog(description = "查看当前空间状态")
    @PostMapping("/status")
    public Response<SpaceStatusVO> getCurrentSpace() {
        return spaceService.getCurrentSpace();
    }

    @ApiOperationLog(description = "编辑情侣空间基础信息")
    @PostMapping("/update")
    public Response<SpaceStatusVO> updateSpace(@Valid @RequestBody UpdateSpaceReqVO reqVO) {
        return spaceService.updateSpace(reqVO);
    }

    @ApiOperationLog(description = "创建空间邀请")
    @PostMapping("/invitation/create")
    public Response<CreateInvitationRspVO> createInvitation(@Valid @RequestBody CreateInvitationReqVO reqVO) {
        return spaceService.createInvitation(reqVO);
    }

    @ApiOperationLog(description = "查看当前空间邀请")
    @PostMapping("/invitation/list")
    public Response<List<InvitationVO>> listSpaceInvitations() {
        return spaceService.listSpaceInvitations();
    }

    @ApiOperationLog(description = "查看我收到的邀请")
    @PostMapping("/invitation/received")
    public Response<List<InvitationVO>> listReceivedInvitations() {
        return spaceService.listReceivedInvitations();
    }

    @ApiOperationLog(description = "撤销空间邀请")
    @PostMapping("/invitation/revoke")
    public Response<Void> revokeInvitation(@Valid @RequestBody InvitationIdReqVO reqVO) {
        return spaceService.revokeInvitation(reqVO);
    }

    @ApiOperationLog(description = "预览空间邀请")
    @PostMapping("/invitation/preview")
    public Response<InvitationPreviewVO> previewInvitation(@Valid @RequestBody InvitationTokenReqVO reqVO) {
        return spaceService.previewInvitation(reqVO);
    }

    @ApiOperationLog(description = "接受空间邀请")
    @PostMapping("/invitation/accept")
    public Response<SpaceStatusVO> acceptInvitation(@Valid @RequestBody AcceptInvitationReqVO reqVO) {
        return spaceService.acceptInvitation(reqVO);
    }

    @ApiOperationLog(description = "冻结情侣空间")
    @PostMapping("/freeze")
    public Response<Void> freezeSpace() {
        return spaceService.freezeSpace();
    }

    @ApiOperationLog(description = "确认恢复情侣空间")
    @PostMapping("/restore/confirm")
    public Response<RestoreConfirmVO> confirmRestore() {
        return spaceService.confirmRestore();
    }

    @ApiOperationLog(description = "发起解绑申请（旧 /space/leave 兼容入口）")
    @PostMapping("/leave")
    public Response<UnbindStatusVO> leaveSpace() {
        return spaceService.leaveSpace();
    }

    @ApiOperationLog(description = "发起情侣空间解绑申请")
    @PostMapping("/unbind/request")
    public Response<UnbindStatusVO> requestUnbind() {
        return spaceService.requestUnbind();
    }

    @ApiOperationLog(description = "取消情侣空间解绑申请")
    @PostMapping("/unbind/cancel")
    public Response<UnbindStatusVO> cancelUnbind() {
        return spaceService.cancelUnbind();
    }

    @ApiOperationLog(description = "拒绝情侣空间解绑申请")
    @PostMapping("/unbind/reject")
    public Response<UnbindStatusVO> rejectUnbind() {
        return spaceService.rejectUnbind();
    }

    @ApiOperationLog(description = "确认情侣空间解绑申请")
    @PostMapping("/unbind/confirm")
    public Response<UnbindStatusVO> confirmUnbind() {
        return spaceService.confirmUnbind();
    }

    @ApiOperationLog(description = "设置情侣空间公开状态")
    @PostMapping("/visibility")
    public Response<SpaceVisibilityVO> updateVisibility(@Valid @RequestBody SpaceVisibilityReqVO reqVO) {
        return spaceService.updateVisibility(reqVO);
    }
}
