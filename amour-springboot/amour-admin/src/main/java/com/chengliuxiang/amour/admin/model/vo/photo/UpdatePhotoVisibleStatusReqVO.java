package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class UpdatePhotoVisibleStatusReqVO {

    @NotNull(message = "照片ID不能为空")
    private Long id;

    @NotNull(message = "显示状态不能为空")
    private Boolean isVisible;
}
