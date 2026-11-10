package com.chengliuxiang.amour.admin.model.vo.report;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
public class AdminReportPageReqVO extends BasePageQuery {

    private Integer status;

    /**
     * space/story/photo/anniversary
     */
    private String contentType;

    private Long spaceId;

    private LocalDateTime startTime;

    private LocalDateTime endTime;
}
