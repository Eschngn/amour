package com.chengliuxiang.amour.admin.model.vo.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class FindMessagePageListRspVO {
    private String messageId;
    private Long spaceId;
    private String spaceCode;
    private String spaceName;
    private String userName;
    private String userAmourId;
    private String content;
    private Long replyCount;
    private Integer visibility;
    private String visibilityText;
    private Boolean deleted;
    private Long reportCount;
    private Long pendingReportCount;
    private String createTime;
    private String updateTime;
}
