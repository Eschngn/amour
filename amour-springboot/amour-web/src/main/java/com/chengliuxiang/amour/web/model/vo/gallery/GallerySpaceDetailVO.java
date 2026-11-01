package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.util.List;

/**
 * 恋爱广场公开空间详情。
 * 在卡片字段之外，额外返回全部公开故事、照片和纪念日。
 * 不包含留言板、邀请、用户 ID、createdBy 等私密或后台字段。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@SuperBuilder
@NoArgsConstructor
public class GallerySpaceDetailVO extends GallerySpaceCardVO {

    private List<GalleryStoryDetailVO> stories;

    private List<GalleryPhotoVO> photos;

    private List<GalleryAnniversaryVO> anniversaries;
}
