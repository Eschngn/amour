package com.chengliuxiang.amour.web.controller;

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
    public Response<LoginChallengeVO> challenge() {
        return Response.success(loginCryptoService.createChallenge());
    }

    @PostMapping("/userLogin")
    public Response<LoginRespVO> login(@RequestBody @Validated LoginReqVO loginReqVO) {
        return loginService.login(loginReqVO);
    }

    @PostMapping("/logout")
    public Response<Void> logout() {
        return loginService.logout();
    }
}
