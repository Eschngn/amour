package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class AdminSpaceDetailReqVO {

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;
}
