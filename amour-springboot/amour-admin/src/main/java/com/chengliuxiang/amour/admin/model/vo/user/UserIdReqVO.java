package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class UserIdReqVO {
    @NotNull private Long id;

    /** 停用原因，必填并写入审计 */
    @NotBlank private String reason;
}
