package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceRestoreSummaryVO {

    private Boolean restorable;

    private String restoreBlockReason;

    private Integer confirmedCount;

    private Integer requiredCount;

    private List<ConfirmVO> confirmations;

    /**
     * 两名历史成员在其他未解绑空间中的有效关系。空列表表示不存在冲突。
     */
    private List<AdminSpaceRestoreConflictVO> conflictSpaces;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfirmVO {

        private String amourId;

        private String displayName;

        private String confirmedAt;
    }
}
