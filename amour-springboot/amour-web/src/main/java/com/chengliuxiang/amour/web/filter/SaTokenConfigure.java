package com.chengliuxiang.amour.web.filter;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 前台登录拦截配置。
 *
 * <p>平台已切换到空间成员模型，不再使用 Sa-Token 的角色和权限校验，
 * 这里只保留必要的登录状态校验。</p>
 */
@Configuration
public class SaTokenConfigure implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new SaInterceptor(handler -> {
                    SaRouter.match("/message/**", route -> StpUtil.checkLogin());
                    SaRouter.match("/user/**", route -> StpUtil.checkLogin());
                    // 故事/相册/纪念日均为空间私密内容，统一要求登录后再由空间成员关系校验归属。
                    SaRouter.match("/story/**", "/photo/**", "/anniversary/**")
                            .check(route -> StpUtil.checkLogin());
                    // 举报提交必须登录，具体目标是否公开由 Service 校验。
                    SaRouter.match("/report/**").check(route -> StpUtil.checkLogin());
                    // 邀请预览允许未登录查看，其余空间操作必须登录。
                    SaRouter.match("/space/**")
                            .notMatch("/space/invitation/preview")
                            .check(route -> StpUtil.checkLogin());
                }))
                .addPathPatterns("/**");
    }
}
