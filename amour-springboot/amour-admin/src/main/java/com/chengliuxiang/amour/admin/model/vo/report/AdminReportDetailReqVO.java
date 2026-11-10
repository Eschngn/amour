package com.chengliuxiang.amour.admin.model.vo.report;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class AdminReportDetailReqVO {

    @NotNull(message = "举报ID不能为空")
    private Long reportId;
}
