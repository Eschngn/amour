package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 恋爱广场公开故事详情，只由公开快照返回。
 * 故事只保留封面图片，不返回故事附图、创建人、审核字段等私密信息。
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

    /** 时间展示精度：false 表示仅展示日期。 */
    private Boolean showTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private Boolean isMilestone;
}
