package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 恋爱广场故事摘要，只用于公开卡片和公开详情中的 latestStory。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryStorySummaryVO {

    private Long storyId;

    private String title;

    private String summary;

    private LocalDateTime happenedTime;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Boolean isMilestone;
}
