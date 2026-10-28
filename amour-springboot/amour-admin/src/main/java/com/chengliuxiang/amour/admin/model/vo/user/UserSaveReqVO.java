package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

@Data
public class UserSaveReqVO {
    private String id;
    @NotBlank @Size(max = 60) private String username;
    @Size(max = 60) private String password;
    @NotBlank @Size(max = 60) private String displayName;
    @Size(max = 500) private String avatar;
    @NotNull private Integer status;
    private List<String> roleIds;
}
