package com.chengliuxiang.amour.admin.model.vo.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportPageRspVO {

    private Long reportId;

    private String contentType;

    private String contentTypeText;

    private Long contentId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private Integer spaceStatus;

    private Integer spaceVisibility;

    private String targetTitle;

    private Integer targetVisibility;

    private String targetVisibilityText;

    private Boolean targetDeleted;

    private String reporterAmourId;

    private String reporterName;

    private String reason;

    private Integer status;

    private String statusText;

    private String processedByAmourId;

    private String processedByName;

    private String processedAt;

    private String createTime;

    private String handleAction;

    private String handleNote;

    private String handleAt;
}
