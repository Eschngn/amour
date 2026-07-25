package com.chengliuxiang.amour.web.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chengliuxiang.amour.common.domain.dos.SiteConfigDO;
import com.chengliuxiang.amour.common.domain.mapper.SiteConfigMapper;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.service.SiteConfigService;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;

@Service
public class SiteConfigServiceImpl implements SiteConfigService {

    @Resource
    private SiteConfigMapper siteConfigMapper;

    @Override
    public Response<String> queryConfigValue(String configKey) {
        SiteConfigDO siteConfig = siteConfigMapper.selectOne(
                new LambdaQueryWrapper<SiteConfigDO>()
                        .select(SiteConfigDO::getConfigValue)
                        .eq(SiteConfigDO::getConfigKey, configKey)
                        .last("LIMIT 1")
        );
        if (siteConfig == null) {
            return Response.fail("未找到配置项：" + configKey);
        }
        return Response.success(siteConfig.getConfigValue());
    }
}
