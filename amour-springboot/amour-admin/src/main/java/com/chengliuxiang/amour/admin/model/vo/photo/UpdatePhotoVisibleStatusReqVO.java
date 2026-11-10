package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class UpdatePhotoVisibleStatusReqVO {

    @NotNull(message = "照片ID不能为空")
    private Long id;

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;

    /**
     * 0-仅空间成员 1-公开 2-隐藏
     */
    private Integer visibility;

    /**
     * @deprecated 请使用 visibility
     */
    @Deprecated
    private Boolean isVisible;

    @NotBlank(message = "请填写操作原因")
    private String reason;
}
