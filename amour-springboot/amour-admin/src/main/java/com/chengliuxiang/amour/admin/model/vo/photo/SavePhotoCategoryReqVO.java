package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class SavePhotoCategoryReqVO {

    private Long id;

    @NotBlank(message = "分类名称不能为空")
    @Size(max = 100, message = "分类名称不能超过100个字符")
    private String categoryName;

    private Boolean isEnabled;
}
