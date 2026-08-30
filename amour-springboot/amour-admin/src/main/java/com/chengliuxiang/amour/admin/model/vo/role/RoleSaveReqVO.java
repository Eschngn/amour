package com.chengliuxiang.amour.admin.model.vo.role;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.util.List;

@Data
public class RoleSaveReqVO {
    private Long id;
    @NotBlank @Size(max = 32)
    private String roleName;
    @NotBlank @Size(max = 32)
    private String roleKey;
    @NotNull
    private Integer status;
    private Integer sort;
    @Size(max = 255)
    private String remark;
    private List<Long> permissionIds;
}
