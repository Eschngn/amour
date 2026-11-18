package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.Data;

import javax.validation.constraints.NotNull;

/**
 * 后台查询单条销毁留档详情。
 */
@Data
public class AdminSpaceArchiveDetailReqVO {

    @NotNull(message = "留档ID不能为空")
    private Long archiveId;
}
