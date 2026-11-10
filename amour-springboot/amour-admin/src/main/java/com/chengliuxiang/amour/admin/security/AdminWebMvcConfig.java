package com.chengliuxiang.amour.admin.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.annotation.Resource;

/**
 * 注册后台授权拦截器。登录/挑战接口只做认证，不要求细粒度权限。
 */
@Configuration
public class AdminWebMvcConfig implements WebMvcConfigurer {

    @Resource
    private AdminPermissionInterceptor adminPermissionInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminPermissionInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns(
                        "/admin/login",
                        "/admin/login/challenge",
                        "/admin/logout",
                        "/admin/auth/permissions");
    }
}
