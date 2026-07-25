package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.login.LoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.LoginRespVO;

public interface LoginService {

    /**
     * 前台用户登录
     */
    Response<LoginRespVO> login(LoginReqVO loginReqVO);

    /**
     * 登出
     */
    Response<Void> logout();
}
