package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class DeletePhotoCategoryReqVO {

    @NotNull(message = "照片分类ID不能为空")
    private Long id;
}
