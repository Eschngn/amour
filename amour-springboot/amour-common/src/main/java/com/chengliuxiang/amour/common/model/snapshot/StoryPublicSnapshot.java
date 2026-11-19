package com.chengliuxiang.amour.common.model.snapshot;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 故事公开快照。故事只保留封面，历史快照中的 images 字段在读取时忽略。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class StoryPublicSnapshot {

    private Long storyId;

    private Long chapterId;

    private String chapterName;

    private String title;

    private String summary;

    private String content;

    private String happenedTime;

    /** 时间展示精度：历史快照缺失时按 true（展示日期和时间）兼容。 */
    private Boolean showTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Integer sortOrder;

    private Boolean milestone;
}
