package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FindStoryDetailRspVO {
    private Long id;
    private String title;
    private String content;
    private String chapterId;
    private String chapterName;
    private String happenedTime;
    private String location;
    private String coverImage;
    private String tagLabel;
    private String tagColor;
    private Boolean isMilestone;
    private List<ImageVO> images;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class ImageVO {
        private Long id;
        private String url;
        private String altText;
        private Integer sortOrder;
    }
}
