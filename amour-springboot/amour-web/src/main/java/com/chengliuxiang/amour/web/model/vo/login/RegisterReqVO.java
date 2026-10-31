package com.chengliuxiang.amour.web.model.vo.login;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RegisterReqVO {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 4, max = 20, message = "用户名长度需为 4-20 个字符")
    @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "用户名只能包含英文、数字和下划线")
    private String username;

    @Size(max = 20, message = "展示名称不能超过 20 个字符")
    private String displayName;

    @NotBlank(message = "注册挑战不能为空")
    @Size(max = 64, message = "注册挑战格式错误")
    private String challengeId;

    @NotBlank(message = "加密密码不能为空")
    @Size(max = 1024, message = "加密密码格式错误")
    private String encryptedPassword;
}
