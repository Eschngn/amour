package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestoreConfirmVO {

    /**
     * 空间是否已经恢复为正常状态。
     */
    private Boolean restored;

    private Integer status;

    private String statusText;

    private Integer confirmedCount;

    private Integer requiredCount;
}
