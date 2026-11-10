package com.chengliuxiang.amour.admin.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindAnniversaryDetailRspVO {
    private Long id;
    private Long spaceId;
    private String spaceCode;
    private String spaceName;
    private Integer spaceStatus;
    private String spaceStatusText;
    private Integer spaceVisibility;
    private Integer visibility;
    private String visibilityText;
    private Boolean deleted;
    private String authorAmourId;
    private String authorName;
    private String title;
    private String description;
    private LocalDate anniversaryDate;
    private Integer repeatType;
    private String category;
    private String colorCode;
    private String location;
    private Integer sortOrder;
    private Long pendingReportCount;
    /**
     * @deprecated 请使用 visibility
     */
    @Deprecated
    private Boolean isVisible;
    private String createTime;
    private String updateTime;
}
