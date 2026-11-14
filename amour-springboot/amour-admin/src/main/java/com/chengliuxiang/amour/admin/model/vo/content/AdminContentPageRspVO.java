package com.chengliuxiang.amour.admin.model.vo.content;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminContentPageRspVO {

    private String contentType;

    private String contentTypeText;

    private Long contentId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private Integer spaceStatus;

    private Integer spaceVisibility;

    private String title;

    private String summary;

    private String coverImage;

    private String url;

    private Boolean isCover;

    private Integer sortOrder;

    private String colorCode;

    private Integer repeatType;

    private String location;

    private Integer visibility;

    private String visibilityText;

    private Boolean deleted;

    private String authorAmourId;

    private String authorName;

    private String chapterId;

    private String chapterName;

    private Long photoCategoryId;

    private String categoryName;

    private String happenedTime;

    private String createTime;

    private String updateTime;

    private Integer replyCount;
}
