package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户端空间公开审核状态。
 *
 * <p>只返回当前空间的审核摘要，不暴露其他空间的提交或审核人信息。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceReviewStatusVO {

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private Integer spaceStatus;

    private String spaceStatusText;

    /**
     * 0-私密 1-公开；审核期间仍保持 0 或旧的 1。
     */
    private Integer visibility;

    private String visibilityText;

    private LocalDateTime publicAt;

    /**
     * 是否存在待审核提交。
     */
    private Boolean pending;

    private Long submissionId;

    private String reviewType;

    private String reviewTypeText;

    /**
     * 当前展示的提交（待审核优先，否则最近一次已处理）的审核项统计。
     */
    private Integer itemCount;

    private Integer pendingItemCount;

    private Integer approvedItemCount;

    private Integer rejectedItemCount;

    private Integer withdrawnItemCount;

    private Integer pendingContentItemCount;

    /**
     * 最近一次提交中被驳回的审核项，含项级原因，供用户端展开查看。
     */
    private List<RejectedItemVO> rejectedItems;

    /**
     * 最近一次已处理提交的状态（APPROVED / REJECTED），无历史时为空。
     */
    private String lastReviewStatus;

    private String lastReviewStatusText;

    private String rejectReason;

    private LocalDateTime lastSubmittedAt;

    private LocalDateTime lastHandledAt;

    /**
     * 空间公开内容是否已被管理员整体下架。
     */
    private Boolean unpublished;

    /**
     * 当前是否具备发起公开审核的资格。
     */
    private Boolean canSubmit;

    /**
     * 当前是否可以重新提交（被驳回或撤回后，且没有待审核提交）。
     */
    private Boolean canResubmit;

    /**
     * 面向用户的简短说明，前端可直接展示。
     */
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectedItemVO {

        private String itemType;

        private String itemTypeText;

        private Long itemId;

        private String title;

        private String rejectReason;

        private LocalDateTime handledAt;
    }
}
