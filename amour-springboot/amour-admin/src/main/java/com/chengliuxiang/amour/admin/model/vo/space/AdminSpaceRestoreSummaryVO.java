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
