package com.chengliuxiang.amour.common.model.snapshot;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 故事公开快照。图片随故事合并保存，保证一次审核通过即可整体替换。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryPublicSnapshot {

    private Long storyId;

    private Long chapterId;

    private String chapterName;

    private String title;

    private String summary;

    private String content;

    private String happenedTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Integer sortOrder;

    private Boolean milestone;

    @Builder.Default
    private List<ImagePublicSnapshot> images = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImagePublicSnapshot {

        private String url;

        private String altText;

        private Integer sortOrder;
    }
}
