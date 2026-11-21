package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户端故事节点管理数据（包含隐藏内容与审核状态）。
 * 故事只保留封面，不再返回历史故事附图。
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

    /** 时间展示精度：true-日期和时间 false-仅日期。 */
    private Boolean showTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    /** 章节内排序值。 */
    private Integer sortOrder;

    /** 跨章节的全局排序值。 */
    private Integer globalSortOrder;

    private Boolean isMilestone;

    private Integer visibility;

    /**
     * 公开审核状态：PENDING / REJECTED / PUBLISHED / UNPUBLISHED；不需要审核时为空。
     */
    private String reviewStatus;

    /**
     * 审核未通过时的项级原因。
     */
    private String reviewRejectReason;

    /**
     * 项级审核处理时间。
     */
    private LocalDateTime reviewHandledAt;

    /**
     * 恋爱广场当前是否仍展示该内容上一次通过的版本。
     */
    private Boolean reviewHasPublishedVersion;
}
