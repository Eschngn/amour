package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
public class UserSaveReqVO {
    private Long id;
    @NotBlank @Size(max = 60) private String username;
    @Size(max = 60) private String password;
    @NotBlank @Size(max = 60) private String displayName;
    @Size(max = 500) private String avatar;
    @NotNull private Integer status;
    /** 是否为平台管理员 */
    private Boolean platformAdmin;
}
