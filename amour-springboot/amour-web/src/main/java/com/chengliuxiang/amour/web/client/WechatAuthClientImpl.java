package com.chengliuxiang.amour.web.client;

import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.web.config.WechatProperties;
import com.chengliuxiang.amour.web.model.wechat.WechatCode2SessionResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import javax.annotation.Resource;

@Component
@Slf4j
public class WechatAuthClientImpl implements WechatAuthClient {

    @Resource
    private RestTemplate wechatRestTemplate;

    @Resource
    private WechatProperties wechatProperties;

    @Resource
    private ObjectMapper objectMapper;

    @Override
    public WechatCode2SessionResponse code2Session(String code) {
        if (StrUtil.isBlank(wechatProperties.getAppId())
                || StrUtil.isBlank(wechatProperties.getAppSecret())) {
            log.error("微信登录配置缺失，请配置 amour.wechat.app-id 和 amour.wechat.app-secret");
            throw new BizException(ResponseCodeEnum.WECHAT_CONFIG_INVALID);
        }

        String url = UriComponentsBuilder.fromHttpUrl(wechatProperties.getCode2SessionUrl())
                .queryParam("appid", wechatProperties.getAppId())
                .queryParam("secret", wechatProperties.getAppSecret())
                .queryParam("js_code", code)
                .queryParam("grant_type", "authorization_code")
                .toUriString();
        try {
            // 微信接口偶尔将 JSON 响应声明为 text/plain，先接收原文避免受响应头影响。
            String responseBody = wechatRestTemplate.getForObject(url, String.class);
            WechatCode2SessionResponse response = objectMapper.readValue(
                    responseBody, WechatCode2SessionResponse.class);
            if (response == null || (response.getErrcode() != null && response.getErrcode() != 0)
                    || StrUtil.isBlank(response.getOpenid())
                    || StrUtil.isBlank(response.getSessionKey())) {
                log.warn("微信 code2Session 失败，errcode: {}, errmsg: {}",
                        response == null ? null : response.getErrcode(),
                        response == null ? null : response.getErrmsg());
                throw new BizException(ResponseCodeEnum.WECHAT_LOGIN_FAILED);
            }
            return response;
        } catch (BizException e) {
            throw e;
        } catch (RestClientException | JsonProcessingException e) {
            log.error("调用微信 code2Session 接口失败", e);
            throw new BizException(ResponseCodeEnum.WECHAT_LOGIN_FAILED);
        }
    }

}
