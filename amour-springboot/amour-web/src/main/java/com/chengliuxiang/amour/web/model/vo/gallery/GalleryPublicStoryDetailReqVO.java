package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.Data;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;

/**
 * 恋爱广场公开故事详情查询参数。
 *
 * <p>必须同时提供空间 ID 与故事 ID，后端只在对应空间的公开快照内查找故事。</p>
 */
@Data
public class GalleryPublicStoryDetailReqVO {

    @NotNull(message = "空间ID不能为空")
    @Positive(message = "空间ID格式不正确")
    private Long spaceId;

    @NotNull(message = "故事ID不能为空")
    @Positive(message = "故事ID格式不正确")
    private Long storyId;
}
