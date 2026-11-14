package com.chengliuxiang.amour.admin.model.vo.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardSummaryVO {

    /**
     * 待审核空间数（存在待审核提交的去重空间数）。
     */
    private Long pendingSpaceReviewCount;

    /**
     * 待审核项总数（空间信息 + 主页配置 + 内容）。
     */
    private Long pendingReviewItemCount;

    /**
     * 待审核内容项数（故事 + 照片 + 纪念日）。
     */
    private Long pendingContentReviewCount;

    /**
     * 最近 7 天被驳回的审核提交数。
     */
    private Long recentRejectedReviewCount;

    /**
     * 最近 7 天被管理员下架的公开项数。
     */
    private Long recentUnpublishedCount;

    private Long totalSpaceCount;

    private Long waitingSpaceCount;

    private Long normalSpaceCount;

    private Long frozenSpaceCount;

    private Long archivedSpaceCount;

    private Long unbindPendingSpaceCount;

    private Long unboundSpaceCount;

    private Long publicSpaceCount;

    private Long totalUserCount;

    private Long activeUserCount;

    private Long platformAdminCount;

    private String generatedAt;
}
