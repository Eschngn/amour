package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.config.SiteConfigQueryReqVO;
import com.chengliuxiang.amour.web.service.SiteConfigService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/site-config")
public class SiteConfigController {

    @Resource
    private SiteConfigService siteConfigService;

    @PostMapping("/query")
    @ApiOperationLog(description = "根据配置键查询网站配置")
    public Response<String> queryConfigValue(@RequestBody @Validated SiteConfigQueryReqVO reqVO) {
        return siteConfigService.queryConfigValue(reqVO.getConfigKey());
    }
}
