package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoIdReqVO {

    @NotNull(message = "照片 ID 不能为空")
    private Long id;
}
