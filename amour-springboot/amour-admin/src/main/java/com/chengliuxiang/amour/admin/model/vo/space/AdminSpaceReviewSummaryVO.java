package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 后台空间列表/详情中的公开审核摘要。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceReviewSummaryVO {

    private Boolean pending;

    private Long submissionId;

    private String reviewType;

    private String reviewTypeText;

    private Integer pendingItemCount;

    /**
     * 最近一次已处理提交的状态：APPROVED / REJECTED；无历史时为空。
     */
    private String lastReviewStatus;

    private String lastReviewStatusText;

    private String lastReviewAt;

    private String rejectReason;
}
