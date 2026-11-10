package com.chengliuxiang.amour.admin.model.vo.audit;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
public class AdminAuditPageReqVO extends BasePageQuery {

    private String action;

    private String targetType;

    private Long targetSpaceId;

    private Long adminUserId;

    private LocalDateTime startTime;

    private LocalDateTime endTime;
}
