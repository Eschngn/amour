package com.chengliuxiang.amour.web.client;

import com.chengliuxiang.amour.web.model.wechat.WechatCode2SessionResponse;

public interface WechatAuthClient {

    WechatCode2SessionResponse code2Session(String code);
}
