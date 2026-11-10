package com.chengliuxiang.amour.web.model.vo.report;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 用户端举报提交。只能举报已公开的空间或公开内容。
 */
@Data
public class ContentReportSubmitReqVO {

    @NotBlank(message = "举报类型不能为空")
    private String contentType;

    @NotNull(message = "被举报对象ID不能为空")
    private Long contentId;

    @NotBlank(message = "请填写举报原因")
    @Size(max = 1000, message = "举报原因不能超过1000个字符")
    private String reason;
}
