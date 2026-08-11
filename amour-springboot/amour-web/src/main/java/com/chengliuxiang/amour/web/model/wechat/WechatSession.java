package com.chengliuxiang.amour.web.model.wechat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WechatSession {

    private String openid;

    private String sessionKey;

    private String unionid;
}
