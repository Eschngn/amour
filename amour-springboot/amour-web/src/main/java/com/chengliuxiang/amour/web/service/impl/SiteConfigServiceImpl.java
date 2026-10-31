package com.chengliuxiang.amour.web.service.impl;

import com.chengliuxiang.amour.common.domain.dos.PlatformConfigDO;
import com.chengliuxiang.amour.common.domain.mapper.PlatformConfigMapper;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.service.SiteConfigService;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;

@Service
public class SiteConfigServiceImpl implements SiteConfigService {

    @Resource
    private PlatformConfigMapper platformConfigMapper;

    @Override
    public Response<String> queryConfigValue(String configKey) {
        PlatformConfigDO config = platformConfigMapper.selectValueByKey(configKey);
        if (config == null) {
            return Response.fail("未找到配置项：" + configKey);
        }
        return Response.success(config.getConfigValue());
    }
}
