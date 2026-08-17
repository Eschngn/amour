package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.login.LoginChallengeVO;
import com.chengliuxiang.amour.common.service.LoginCryptoService;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.login.LoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.LoginRespVO;
import com.chengliuxiang.amour.web.service.LoginService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/login")
public class LoginController {

    @Resource
    private LoginService loginService;

    @Resource
    private LoginCryptoService loginCryptoService;

    @PostMapping("/challenge")
    @ApiOperationLog(description = "获取用户登录挑战码")
    public Response<LoginChallengeVO> challenge() {
        return Response.success(loginCryptoService.createChallenge());
    }

    @PostMapping("/userLogin")
    @ApiOperationLog(description = "用户登录")
    public Response<LoginRespVO> login(@RequestBody @Validated LoginReqVO loginReqVO) {
        return loginService.login(loginReqVO);
    }

    @PostMapping("/logout")
    @ApiOperationLog(description = "用户退出登录")
    public Response<Void> logout() {
        return loginService.logout();
    }
}
