package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.Data;

import javax.validation.constraints.NotNull;

/**
 * 后台空间审核详情查询。
 */
@Data
public class AdminSpaceReviewDetailReqVO {

    @NotNull(message = "审核提交ID不能为空")
    private Long submissionId;
}
