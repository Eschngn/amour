package com.chengliuxiang.amour.web.model.vo.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordReqVO {

    @NotBlank(message = "当前密码验证信息不能为空")
    @Size(max = 64, message = "当前密码验证信息格式错误")
    private String currentChallengeId;

    @NotBlank(message = "当前密码密文不能为空")
    @Size(max = 1024, message = "当前密码密文格式错误")
    private String encryptedCurrentPassword;

    @NotBlank(message = "新密码验证信息不能为空")
    @Size(max = 64, message = "新密码验证信息格式错误")
    private String newChallengeId;

    @NotBlank(message = "新密码密文不能为空")
    @Size(max = 1024, message = "新密码密文格式错误")
    private String encryptedNewPassword;
}
