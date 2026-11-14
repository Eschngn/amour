package com.chengliuxiang.amour.admin.model.vo.content;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminContentDetailRspVO {

    private String contentType;

    private String contentTypeText;

    private Long contentId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private String spaceDescription;

    private Integer spaceStatus;

    private String spaceStatusText;

    private Integer spaceVisibility;

    private String spaceVisibilityText;

    private String title;

    private String summary;

    private String content;

    private String happenedTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Boolean milestone;

    private Long chapterId;

    private String chapterName;

    private Long photoCategoryId;

    private String categoryName;

    private String photoUrl;

    private String anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private Integer sortOrder;

    private Integer visibility;

    private String visibilityText;

    private Boolean deleted;

    private String authorAmourId;

    private String authorName;

    private String createTime;

    private String updateTime;

    private Integer replyCount;

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
