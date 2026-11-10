package com.chengliuxiang.amour.admin.model.vo.content;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class AdminContentDetailReqVO {

    @NotBlank(message = "内容类型不能为空")
    private String contentType;

    @NotNull(message = "内容ID不能为空")
    private Long contentId;

    /**
     * 详情查询允许在拥有跨空间权限时省略；治理写操作必须显式提供。
     */
    private Long spaceId;
}
