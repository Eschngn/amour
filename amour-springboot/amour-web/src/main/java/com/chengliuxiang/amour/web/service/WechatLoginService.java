package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginRespVO;
import com.chengliuxiang.amour.web.model.wechat.WechatSession;

public interface WechatLoginService {

    Response<WechatLoginRespVO> login(WechatLoginReqVO reqVO);

    /** 根据服务端 token 读取微信会话，session_key 不应直接返回给客户端。 */
    WechatSession getSession(String token);
}
