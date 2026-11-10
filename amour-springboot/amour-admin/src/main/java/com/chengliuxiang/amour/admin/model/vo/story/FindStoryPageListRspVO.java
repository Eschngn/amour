package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class FindStoryPageListRspVO {
    private Long id;
    private Long spaceId;
    private String spaceCode;
    private String spaceName;
    private Integer spaceStatus;
    private Integer spaceVisibility;
    private String title;
    private String summary;
    private String coverImage;
    /**
     * 真实可见性：0-仅空间成员 1-公开 2-隐藏。
     */
    private Integer visibility;
    private String visibilityText;
    private Boolean deleted;
    /**
     * 兼容旧字段，仅表示未被隐藏；公开与成员可见都返回 true。
     *
     * @deprecated 请使用 visibility
     */
    @Deprecated
    private Boolean isVisible;
    private String authorAmourId;
    private String authorName;
    private Long reportCount;
    private Long pendingReportCount;
    private String chapterId;
    private String chapterName;
    private String happenedTime;
    private String createTime;
    private String updateTime;
}
