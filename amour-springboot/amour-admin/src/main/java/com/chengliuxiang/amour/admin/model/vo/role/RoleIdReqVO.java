package com.chengliuxiang.amour.admin.model.vo.role;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class RoleIdReqVO {
    @NotNull
    private String id;
}
