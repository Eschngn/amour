package com.chengliuxiang.amour.web.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 微信小程序登录配置。AppSecret 只在服务端配置，禁止返回给客户端。 */
@Data
@Component
@ConfigurationProperties(prefix = "amour.wechat")
public class WechatProperties {

    private String appId;

    private String appSecret;

    private String code2SessionUrl = "https://api.weixin.qq.com/sns/jscode2session";
}
