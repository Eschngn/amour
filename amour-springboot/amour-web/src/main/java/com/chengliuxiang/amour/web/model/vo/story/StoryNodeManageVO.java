package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户端故事节点管理数据（包含隐藏内容与图片）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryNodeManageVO {

    private Long id;

    private Long chapterId;

    private String chapterName;

    private String title;

    private String summary;

    private String content;

    private LocalDateTime happenedTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Integer sortOrder;

    private Boolean isMilestone;

    private Integer visibility;

    private List<ImageVO> images;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageVO {

        private Long id;

        private String url;

        private String altText;

        private Integer sortOrder;
    }
}
