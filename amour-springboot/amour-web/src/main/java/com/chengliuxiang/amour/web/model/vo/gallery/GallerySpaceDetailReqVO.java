package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.Data;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;

/**
 * 恋爱广场公开空间详情查询参数。
 */
@Data
public class GallerySpaceDetailReqVO {

    @NotNull(message = "空间ID不能为空")
    @Positive(message = "空间ID格式不正确")
    private Long spaceId;
}
