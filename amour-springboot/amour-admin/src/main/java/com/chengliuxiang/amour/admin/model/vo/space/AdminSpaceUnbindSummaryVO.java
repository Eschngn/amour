package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceUnbindSummaryVO {

    private Long requestId;

    private Integer status;

    private String statusText;

    private String requesterAmourId;

    private String requesterName;

    private String requestedAt;

    private String resolvedAt;

    private Long latestRequestId;

    private Integer latestStatus;

    private String latestStatusText;

    private String latestResolvedAt;

    private Boolean pending;
}
