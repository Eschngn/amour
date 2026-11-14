package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户端相册管理照片数据（包含隐藏照片）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoManageItemVO {

    private Long id;

    private String title;

    private String description;

    private Long photoCategoryId;

    private String categoryName;

    private String url;

    private LocalDateTime takenTime;

    private String location;

    private Integer sortOrder;

    private Boolean isCover;

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏。
     */
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

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
