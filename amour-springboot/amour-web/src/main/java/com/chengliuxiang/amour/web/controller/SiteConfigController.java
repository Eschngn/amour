package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.config.SiteConfigBatchQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.config.SiteConfigQueryReqVO;
import com.chengliuxiang.amour.web.service.SiteConfigService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.Map;

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

    /**
     * 批量查询前台默认图片配置，避免首页为多个配置键串行发起请求。
     * 只返回白名单键，且只返回通过图片地址校验的非空值。
     */
    @PostMapping("/query-batch")
    @ApiOperationLog(description = "批量查询前台默认图片配置")
    public Response<Map<String, String>> queryConfigValues(
            @RequestBody(required = false) @Validated SiteConfigBatchQueryReqVO reqVO) {
        return siteConfigService.queryPublicConfigValues(reqVO == null ? null : reqVO.getConfigKeys());
    }
}
