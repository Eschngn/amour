package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 恋爱广场公开空间卡片。
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class GallerySpaceCardVO {

    private Long spaceId;

    private String spaceName;

    private String description;

    private String coverImage;

    private LocalDateTime loveStartTime;

    private Integer memberCount;

    /**
     * 只包含公开展示所需的成员字段，不返回用户 ID、恋语 ID 等内部标识。
     */
    private List<GallerySpaceMemberVO> members;

    private Long publicStoryCount;

    private Long publicPhotoCount;

    private Long publicAnniversaryCount;

    private GalleryStorySummaryVO latestStory;

    private List<GalleryPhotoVO> latestPhotos;

    private List<GalleryAnniversaryVO> latestAnniversaries;
}
