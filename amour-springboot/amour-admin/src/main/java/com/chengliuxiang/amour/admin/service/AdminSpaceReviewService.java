package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewApproveReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewItemReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewRejectReqVO;
import com.chengliuxiang.amour.admin.model.vo.spacereview.AdminSpaceReviewUnpublishReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

/**
 * 后台情侣空间公开审核。
 */
public interface AdminSpaceReviewService {

    Response<PageResult<AdminSpaceReviewPageRspVO>> findPage(AdminSpaceReviewPageReqVO reqVO);

    Response<AdminSpaceReviewDetailRspVO> findDetail(AdminSpaceReviewDetailReqVO reqVO);

    Response<Void> approve(AdminSpaceReviewApproveReqVO reqVO);

    /**
     * 通过单个待审核项：只发布该项快照，其他待审核项不受影响。
     */
    Response<Void> approveItem(AdminSpaceReviewItemReqVO reqVO);

    Response<Void> reject(AdminSpaceReviewRejectReqVO reqVO);

    /**
     * 驳回单个待审核项：不修改任何已发布快照。
     */
    Response<Void> rejectItem(AdminSpaceReviewItemReqVO reqVO);

    Response<Void> unpublish(AdminSpaceReviewUnpublishReqVO reqVO);
}
