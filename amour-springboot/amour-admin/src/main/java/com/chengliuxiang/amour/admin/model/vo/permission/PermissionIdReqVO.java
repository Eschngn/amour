package com.chengliuxiang.amour.admin.model.vo.permission;

import lombok.Data;

import jakarta.validation.constraints.NotNull;

@Data
public class PermissionIdReqVO {
    @NotNull
    private String id;
}
