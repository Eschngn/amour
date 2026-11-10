package com.chengliuxiang.amour.admin.model.vo.report;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class AdminReportProcessReqVO {

    @NotNull(message = "举报ID不能为空")
    private Long reportId;

    /**
     * reject-驳回；confirm-确认违规
     */
    @NotBlank(message = "处理动作不能为空")
    private String action;

    @NotBlank(message = "请填写处理备注")
    private String note;

    /**
     * 确认违规时是否隐藏目标内容，默认 true。
     */
    private Boolean hideContent;

    /**
     * 确认违规时是否同时把目标空间设为私密，默认 false。
     */
    private Boolean setSpacePrivate;
}
