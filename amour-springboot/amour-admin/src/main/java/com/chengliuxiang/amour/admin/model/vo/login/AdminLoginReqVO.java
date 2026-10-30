package com.chengliuxiang.amour.admin.model.vo.login;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AdminLoginReqVO {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "登录挑战不能为空")
    @Size(max = 64, message = "登录挑战格式错误")
    private String challengeId;

    @NotBlank(message = "加密密码不能为空")
    @Size(max = 1024, message = "加密密码格式错误")
    private String encryptedPassword;
}
