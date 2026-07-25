package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.login.AdminLoginReqVO;
import com.chengliuxiang.amour.admin.service.AdminLoginService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.login.LoginChallengeVO;
import com.chengliuxiang.amour.common.service.LoginCryptoService;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/admin")
public class AdminLoginController {

    @Resource
    private AdminLoginService adminLoginService;

    @Resource
    private LoginCryptoService loginCryptoService;

    @PostMapping("/login/challenge")
    public Response<LoginChallengeVO> challenge() {
        return Response.success(loginCryptoService.createChallenge());
    }

    @PostMapping("/login")
    public Response<String> login(@RequestBody @Validated AdminLoginReqVO adminLoginReqVO){
        return adminLoginService.adminLogin(adminLoginReqVO);
    }

    @PostMapping("/logout")
    @ApiOperationLog(description = "管理员退出登录")
    public Response<Void> logout() {
        return adminLoginService.logout();
    }
}
