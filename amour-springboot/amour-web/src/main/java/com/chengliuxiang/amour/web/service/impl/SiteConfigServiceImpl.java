package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.constant.FrontendSiteConfigConstants;
import com.chengliuxiang.amour.common.domain.dos.PlatformConfigDO;
import com.chengliuxiang.amour.common.domain.mapper.PlatformConfigMapper;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.service.SiteConfigService;
import com.chengliuxiang.amour.web.utils.SafeImageUrlValidator;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    @Override
    public Response<Map<String, String>> queryPublicConfigValues(List<String> configKeys) {
        Set<String> requested = new LinkedHashSet<>();
        if (CollUtil.isNotEmpty(configKeys)) {
            for (String key : configKeys) {
                String normalized = StrUtil.trimToNull(key);
                if (normalized != null && FrontendSiteConfigConstants.DEFAULT_IMAGE_KEYS.contains(normalized)) {
                    requested.add(normalized);
                }
            }
        }
        if (requested.isEmpty()) {
            requested.addAll(FrontendSiteConfigConstants.DEFAULT_IMAGE_KEYS);
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (PlatformConfigDO config : platformConfigMapper.selectByConfigKeys(new ArrayList<>(requested))) {
            String value = StrUtil.trimToEmpty(config.getConfigValue());
            // 空值与非法地址直接视为未配置，由前端回退到占位样式。
            if (SafeImageUrlValidator.isValid(value)) {
                result.put(config.getConfigKey(), value);
            }
        }
        return Response.success(result.isEmpty() ? Collections.emptyMap() : result);
    }
}
