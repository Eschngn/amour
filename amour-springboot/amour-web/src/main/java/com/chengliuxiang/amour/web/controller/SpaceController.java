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

    @ApiOperationLog(description = "归档情侣空间")
    @PostMapping("/archive")
    public Response<Void> archiveSpace() {
        return spaceService.archiveSpace();
    }

    @ApiOperationLog(description = "确认恢复情侣空间")
    @PostMapping("/restore/confirm")
    public Response<RestoreConfirmVO> confirmRestore() {
        return spaceService.confirmRestore();
    }
}
