package com.chengliuxiang.amour.web.filter;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SaTokenConfigure implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new SaInterceptor(handler ->
                        SaRouter.match("/message/publish", route -> StpUtil.checkLogin())
                                .match("/message/reply", route -> StpUtil.checkLogin())
                                .match("/message/reply/delete", route -> StpUtil.checkLogin())
                                .match("/message/delete", route -> StpUtil.checkLogin())
                                .match("/user/**", route -> StpUtil.checkLogin())))
                .addPathPatterns("/**");
    }
}
