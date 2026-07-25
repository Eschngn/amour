package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;

public interface SiteConfigService {

    /**
     * 根据配置键查询配置值。
     *
     * @param configKey 配置唯一标识
     * @return 对应的配置值
     */
    Response<String> queryConfigValue(String configKey);
}
