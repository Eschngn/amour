package com.chengliuxiang.amour.web.model.vo.login;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class WechatLoginReqVO {

    @NotBlank(message = "微信登录凭证不能为空")
    @Size(max = 128, message = "微信登录凭证格式错误")
    private String code;
}
