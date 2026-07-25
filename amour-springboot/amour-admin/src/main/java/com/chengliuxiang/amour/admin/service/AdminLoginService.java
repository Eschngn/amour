package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.login.AdminLoginReqVO;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminLoginService {

    /**
     * 管理员登录
     * @param adminLoginReqVO
     * @return
     */
    Response<String> adminLogin(AdminLoginReqVO adminLoginReqVO);

    /**
     * 管理员退出登录
     */
    Response<Void> logout();
}
