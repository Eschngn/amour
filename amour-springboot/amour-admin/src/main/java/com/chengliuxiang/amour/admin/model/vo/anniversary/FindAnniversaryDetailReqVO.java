package com.chengliuxiang.amour.admin.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindAnniversaryDetailReqVO {
    @NotNull(message = "纪念日ID不能为空")
    private Long id;

    /**
     * 目标空间；缺少时要求跨空间权限。
     */
    private Long spaceId;
}
