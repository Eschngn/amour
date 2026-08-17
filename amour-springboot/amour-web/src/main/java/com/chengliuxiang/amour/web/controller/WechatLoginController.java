package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginReqVO;
import com.chengliuxiang.amour.web.model.vo.login.WechatLoginRespVO;
import com.chengliuxiang.amour.web.service.WechatLoginService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/login")
public class WechatLoginController {

    @Resource
    private WechatLoginService wechatLoginService;

    @PostMapping({"/wechat", "/wechatLogin"})
    @ApiOperationLog(description = "微信登录")
    public Response<WechatLoginRespVO> login(@RequestBody @Validated WechatLoginReqVO reqVO) {
        return wechatLoginService.login(reqVO);
    }
}
