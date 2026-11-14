package com.chengliuxiang.amour.admin.model.vo.content;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class AdminContentModerateReqVO {

    @NotBlank(message = "内容类型不能为空")
    private String contentType;

    @NotNull(message = "内容ID不能为空")
    private Long contentId;

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;

    /**
     * 0-仅空间成员可见 1-公开 2-隐藏
     */
    @NotNull(message = "目标可见性不能为空")
    private Integer visibility;

    @NotBlank(message = "请填写操作原因")
    @Size(max = 500, message = "操作原因不能超过500字")
    private String reason;
}
