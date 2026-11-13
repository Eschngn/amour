package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 人工恢复结果：原空间状态、恢复成员数、撤销邀请数与被安全关闭的冲突空间。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceRestoreRspVO {

    private Long spaceId;

    private Integer status;

    private String statusText;

    private Integer visibility;

    private Integer restoredMemberCount;

    private Integer revokedInvitationCount;

    private List<ClosedConflictSpaceVO> closedConflictSpaces;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClosedConflictSpaceVO {

        private Long spaceId;

        private String spaceCode;

        private String spaceName;

        /**
         * 关闭前的空间状态（当前仅会安全关闭 status=0）。
         */
        private Integer previousStatus;

        private String previousStatusText;

        private Integer revokedInvitationCount;
    }
}
