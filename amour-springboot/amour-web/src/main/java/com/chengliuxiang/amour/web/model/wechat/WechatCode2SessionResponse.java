package com.chengliuxiang.amour.web.model.wechat;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/** 微信 auth.code2Session 响应。sessionKey 只在服务端对象中流转。 */
@Data
public class WechatCode2SessionResponse {

    private String openid;

    @JsonProperty("session_key")
    private String sessionKey;

    private String unionid;

    private Integer errcode;

    private String errmsg;
}
