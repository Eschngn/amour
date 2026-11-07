package com.chengliuxiang.amour.web.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnniversaryIdReqVO {

    @NotNull(message = "纪念日 ID 不能为空")
    private Long id;
}
