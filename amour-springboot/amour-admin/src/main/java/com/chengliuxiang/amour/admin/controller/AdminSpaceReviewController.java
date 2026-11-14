package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewApproveReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewItemReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewRejectReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewUnpublishReqVO;
import com.chengliuxiang.amour.admin.service.AdminSpaceReviewService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

/**
 * 后台空间公开审核。访问权限由 AdminTokenFilter 与 AdminPermissionInterceptor 校验。
 */
@RestController
@RequestMapping("/admin/space-review")
@Validated
public class AdminSpaceReviewController {

    @Resource
    private AdminSpaceReviewService adminSpaceReviewService;

    @PostMapping("/list")
    public Response<PageResult<AdminSpaceReviewPageRspVO>> list(
            @RequestBody AdminSpaceReviewPageReqVO reqVO) {
        return adminSpaceReviewService.findPage(reqVO);
    }

    @PostMapping("/detail")
    public Response<AdminSpaceReviewDetailRspVO> detail(
            @Validated @RequestBody AdminSpaceReviewDetailReqVO reqVO) {
        return adminSpaceReviewService.findDetail(reqVO);
    }

    @PostMapping("/approve")
    @ApiOperationLog(description = "通过情侣空间公开审核")
    public Response<Void> approve(@Validated @RequestBody AdminSpaceReviewApproveReqVO reqVO) {
        return adminSpaceReviewService.approve(reqVO);
    }

    @PostMapping("/reject")
    @ApiOperationLog(description = "驳回情侣空间公开审核")
    public Response<Void> reject(@Validated @RequestBody AdminSpaceReviewRejectReqVO reqVO) {
        return adminSpaceReviewService.reject(reqVO);
    }

    @PostMapping("/item/approve")
    @ApiOperationLog(description = "通过单个空间公开审核项")
    public Response<Void> approveItem(@Validated @RequestBody AdminSpaceReviewItemReqVO reqVO) {
        return adminSpaceReviewService.approveItem(reqVO);
    }

    @PostMapping("/item/reject")
    @ApiOperationLog(description = "驳回单个空间公开审核项")
    public Response<Void> rejectItem(@Validated @RequestBody AdminSpaceReviewItemReqVO reqVO) {
        return adminSpaceReviewService.rejectItem(reqVO);
    }

    @PostMapping("/unpublish")
    @ApiOperationLog(description = "下架情侣空间公开内容")
    public Response<Void> unpublish(@Validated @RequestBody AdminSpaceReviewUnpublishReqVO reqVO) {
        return adminSpaceReviewService.unpublish(reqVO);
    }
}
