package com.chengliuxiang.amour.admin.model.vo.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditPageRspVO {

    private Long id;

    private String adminAmourId;

    private String adminDisplayName;

    private String action;

    private String actionText;

    private String targetType;

    private String targetTypeText;

    private Long targetSpaceId;

    private String targetContentType;

    private Long targetContentId;

    private Long targetUserId;

    private Long targetReviewId;

    private String reason;

    private String result;

    private String detail;

    private String createTime;
}
