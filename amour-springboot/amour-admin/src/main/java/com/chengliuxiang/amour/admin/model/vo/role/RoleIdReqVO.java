package com.chengliuxiang.amour.admin.model.vo.role;

import lombok.Data;
import javax.validation.constraints.NotNull;

@Data
public class RoleIdReqVO {
    @NotNull
    private Long id;
}
