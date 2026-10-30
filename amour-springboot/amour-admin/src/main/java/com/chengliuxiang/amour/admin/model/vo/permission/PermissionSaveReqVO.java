package com.chengliuxiang.amour.admin.model.vo.permission;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class PermissionSaveReqVO {
    private Long id;
    private Long parentId;

    @NotBlank
    @Size(max = 16)
    private String name;

    @NotNull
    private Integer type;

    @Size(max = 32)
    private String menuUrl;

    @Size(max = 255)
    private String menuIcon;

    private Integer sort;

    @NotBlank
    @Size(max = 64)
    private String permissionKey;

    @NotNull
    private Integer status;
}
