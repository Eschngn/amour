package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 * 管理员从销毁留档恢复空间。恢复必须填写原因并写入审计。
 */
@Data
public class AdminSpaceArchiveRestoreReqVO {

    @NotNull(message = "留档ID不能为空")
    private Long archiveId;

    @NotBlank(message = "请填写恢复原因")
    private String reason;
}
