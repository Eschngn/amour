package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.Data;

import javax.validation.constraints.NotNull;

/**
 * 后台人工恢复双方已解绑空间请求。
 */
@Data
public class AdminSpaceRestoreReqVO {

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;
}
