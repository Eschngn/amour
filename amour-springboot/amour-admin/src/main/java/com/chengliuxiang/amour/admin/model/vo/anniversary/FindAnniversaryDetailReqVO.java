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
}
