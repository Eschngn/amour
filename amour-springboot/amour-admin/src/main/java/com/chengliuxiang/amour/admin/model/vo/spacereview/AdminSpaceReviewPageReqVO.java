package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 后台空间审核列表查询。
 */
@Data
public class AdminSpaceReviewPageReqVO {

    private Long current;

    private Long size;

    /**
     * PENDING / APPROVED / REJECTED / WITHDRAWN / SUPERSEDED
     */
    private String status;

    /**
     * 空间名称或 spaceCode 模糊搜索。
     */
    private String keyword;

    private Long spaceId;

    /**
     * FIRST_PUBLISH / CONTENT_UPDATE / REPUBLISH
     */
    private String reviewType;

    /**
     * 提交人恋语 ID。
     */
    private String submittedByAmourId;

    private LocalDateTime startTime;

    private LocalDateTime endTime;
}
