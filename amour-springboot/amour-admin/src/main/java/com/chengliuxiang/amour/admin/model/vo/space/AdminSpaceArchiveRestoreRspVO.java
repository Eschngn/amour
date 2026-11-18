package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 从销毁留档恢复的结果。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceArchiveRestoreRspVO {

    private Long archiveId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private Integer status;

    private String statusText;

    private Integer visibility;

    private String visibilityText;

    /**
     * 实际恢复为有效成员的成员数。
     */
    private Integer restoredMemberCount;

    /**
     * 原样恢复（补回）的内容行数；正常情况下销毁未删除数据，该值为 0。
     */
    private Integer restoredContentCount;

    private Boolean alreadyRestored;
}
