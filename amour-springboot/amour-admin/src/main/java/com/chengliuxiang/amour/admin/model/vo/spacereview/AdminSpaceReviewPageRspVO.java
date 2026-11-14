package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 后台空间审核列表项。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceReviewPageRspVO {

    private Long submissionId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    /**
     * 成员摘要，例如「橙留香 · 子怡」。
     */
    private String memberSummary;

    private List<String> memberNames;

    private Integer spaceStatus;

    private String spaceStatusText;

    private Integer spaceVisibility;

    private String spaceVisibilityText;

    private String reviewType;

    private String reviewTypeText;

    /**
     * 本次提交全部审核项数量（含已通过、已驳回、已撤回、已被替代）。
     */
    private Integer itemCount;

    /**
     * 其中内容项（故事/照片/纪念日）数量。
     */
    private Integer contentItemCount;

    private Integer pendingItemCount;

    private Integer approvedItemCount;

    private Integer rejectedItemCount;

    private Integer withdrawnItemCount;

    /**
     * 项级驳回原因摘要，便于列表直接展示。
     */
    private String itemRejectReason;

    private String submittedByAmourId;

    private String submittedByName;

    private String submittedAt;

    private String status;

    private String statusText;

    private String handledAt;

    private String rejectReason;

    /**
     * 最近一次修改时间（审核项被用户更新时刷新）。
     */
    private String updateTime;
}
