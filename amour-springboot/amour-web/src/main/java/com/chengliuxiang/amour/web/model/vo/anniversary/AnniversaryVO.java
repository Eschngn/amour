package com.chengliuxiang.amour.web.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnniversaryVO {

    private Long id;

    private String title;

    private String description;

    private LocalDate anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private String location;

    private Integer sortOrder;

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏（管理视图使用）。
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
}
