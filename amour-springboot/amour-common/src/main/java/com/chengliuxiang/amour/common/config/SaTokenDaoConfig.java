package com.chengliuxiang.amour.common.config;

import cn.dev33.satoken.dao.SaTokenDao;
import cn.dev33.satoken.dao.SaTokenDaoDefaultImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Sa-Token 会话存储配置。
 *
 * <p>登录态只保存在当前应用进程的内存中，不依赖 Redis 等分布式缓存。
 * 多实例部署时各实例的登录态不共享，重启应用后登录态会失效。</p>
 */
@Configuration
public class SaTokenDaoConfig {

    @Bean
    public SaTokenDao saTokenDao() {
        return new SaTokenDaoDefaultImpl();
    }
}
