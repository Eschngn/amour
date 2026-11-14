package com.chengliuxiang.amour.admin.model.vo.content;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class AdminContentDeleteReqVO {

    @NotBlank(message = "内容类型不能为空")
    private String contentType;

    @NotNull(message = "内容ID不能为空")
    private Long contentId;

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;

    @NotBlank(message = "请填写删除原因")
    @Size(max = 500, message = "删除原因不能超过500字")
    private String reason;
}
