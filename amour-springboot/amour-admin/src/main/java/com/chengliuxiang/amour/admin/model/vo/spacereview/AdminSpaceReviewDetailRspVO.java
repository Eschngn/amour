package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 后台空间审核详情：同时提供当前已发布版本与待审核版本。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceReviewDetailRspVO {

    private Long submissionId;

    private Long spaceId;

    private String status;

    private String statusText;

    private String reviewType;

    private String reviewTypeText;

    private Integer baseRevision;

    private String changeSummary;

    private String submittedByAmourId;

    private String submittedByName;

    private String submittedAt;

    private String handledByAmourId;

    private String handledByName;

    private String handledAt;

    private String rejectReason;

    private SpaceInfoVO space;

    /**
     * 当前广场正在展示的已审核版本。
     */
    private List<ItemVO> publishedItems;

    /**
     * 本次提交的全部审核项（PENDING / APPROVED / REJECTED / WITHDRAWN / SUPERSEDED）。
     */
    private List<ItemVO> reviewItems;

    /**
     * 仅待审核项，保留给旧调用方；新页面请使用 reviewItems。
     */
    private List<ItemVO> pendingItems;

    private Integer itemCount;

    private Integer pendingItemCount;

    private Integer approvedItemCount;

    private Integer rejectedItemCount;

    private Integer withdrawnItemCount;

    private Long publicStoryCount;

    private Long publicPhotoCount;

    private Long publicAnniversaryCount;

    /**
     * 历史审核记录（同一空间最近若干条）。
     */
    private List<HistoryVO> history;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpaceInfoVO {

        private Long spaceId;

        private String spaceCode;

        private String spaceName;

        private String description;

        private String coverImage;

        private Integer status;

        private String statusText;

        private Integer visibility;

        private String visibilityText;

        private String loveStartTime;

        private String publicAt;

        private List<MemberVO> members;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberVO {

        private String amourId;

        private String displayName;

        private String avatar;

        private String roleText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemVO {

        private String itemType;

        private String itemTypeText;

        private Long itemId;

        private String action;

        private String actionText;

        private String itemStatus;

        private String itemStatusText;

        /**
         * 项级驳回原因；只有被驳回的项才有值。
         */
        private String rejectReason;

        /**
         * 处理该审核项的管理员用户ID与处理时间。
         */
        private Long handledBy;

        private String handledAt;

        private Integer baseRevision;

        private Integer currentRevision;

        private String title;

        /**
         * 文本字段差异，只展示发生变化的字段。
         */
        private List<DiffFieldVO> changedFields;

        /**
         * 图片前后对比（故事图片、封面、头像等）。
         */
        private List<String> beforeImages;

        private List<String> afterImages;

        private SummaryVO beforeSummary;

        private SummaryVO afterSummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiffFieldVO {

        private String label;

        private String before;

        private String after;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryVO {

        private String title;

        private String subtitle;

        private String coverImage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryVO {

        private Long submissionId;

        private String status;

        private String statusText;

        private String reviewType;

        private String reviewTypeText;

        private String submittedAt;

        private String handledAt;

        private String rejectReason;
    }
}
