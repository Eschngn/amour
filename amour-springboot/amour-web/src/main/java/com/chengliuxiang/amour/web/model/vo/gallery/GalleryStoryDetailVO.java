package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 恋爱广场公开故事详情，只包含 visibility=1 的故事。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryStoryDetailVO {

    private Long storyId;

    private String title;

    private String summary;

    private String content;

    private LocalDateTime happenedTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Boolean isMilestone;

    private List<GalleryStoryImageVO> images;
}
