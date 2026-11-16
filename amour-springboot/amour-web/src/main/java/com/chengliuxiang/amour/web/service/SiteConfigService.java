package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;

import java.util.List;
import java.util.Map;

public interface SiteConfigService {

    /**
     * 根据配置键查询配置值。
     *
     * @param configKey 配置唯一标识
     * @return 对应的配置值
     */
    Response<String> queryConfigValue(String configKey);

    /**
     * 批量查询前台可公开读取的默认图片配置。
     *
     * <p>只返回白名单内的键；请求键为空时返回整份白名单。空值与非法图片地址不会被返回，
     * 前端据此回退到占位样式。</p>
     *
     * @param configKeys 可选的目标键，超出白名单的键会被忽略
     */
    Response<Map<String, String>> queryPublicConfigValues(List<String> configKeys);
}
