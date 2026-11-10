package com.chengliuxiang.amour.admin.model.vo.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportDetailRspVO {

    private Long reportId;

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

    private String targetTitle;

    private String targetContent;

    private String targetDescription;

    private String targetUrl;

    private String targetHappenedTime;

    private String targetLocation;

    private String targetAuthorAmourId;

    private String targetAuthorName;

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
