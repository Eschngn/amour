package com.chengliuxiang.amour.admin.model.vo.permission;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class PermissionIdReqVO {
    @NotNull
    private Long id;
}
