package com.chengliuxiang.amour.admin.model.vo.role;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

@Data
public class RoleSaveReqVO {
    private String id;
    @NotBlank @Size(max = 32)
    private String roleName;
    @NotBlank @Size(max = 32)
    private String roleKey;
    @NotNull
    private Integer status;
    private Integer sort;
    @Size(max = 255)
    private String remark;
    private List<String> permissionIds;
}
