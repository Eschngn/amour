package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.Data;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 通过空间审核。
 */
@Data
public class AdminSpaceReviewApproveReqVO {

    @NotNull(message = "审核提交ID不能为空")
    private Long submissionId;

    /**
     * 可选的处理备注，写入审计 detail。
     */
    @Size(max = 500, message = "处理备注不能超过500字")
    private String reason;
}
