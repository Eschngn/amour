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

    private Long pendingReportCount;

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
