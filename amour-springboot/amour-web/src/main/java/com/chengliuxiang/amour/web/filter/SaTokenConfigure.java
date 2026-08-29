package com.chengliuxiang.amour.web.filter;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SaTokenConfigure implements WebMvcConfigurer {

    private static final String MESSAGE_USER_ROLE = "message_user";
    private static final String MESSAGE_PUBLISH_PERMISSION = "frontend:message:publish";
    private static final String MESSAGE_REPLY_PERMISSION = "frontend:message:reply";

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new SaInterceptor(handler -> {
                    // Each rule starts a new router chain; chaining different paths would
                    // turn the conditions into an unintended logical AND.
                    SaRouter.match("/message/publish", route -> checkMessagePermission(MESSAGE_PUBLISH_PERMISSION));
                    SaRouter.match("/message/reply", route -> checkMessagePermission(MESSAGE_REPLY_PERMISSION));
                    SaRouter.match("/message/reply/delete", route -> StpUtil.checkLogin());
                    SaRouter.match("/message/delete", route -> StpUtil.checkLogin());
                    SaRouter.match("/user/**", route -> StpUtil.checkLogin());
                }))
                .addPathPatterns("/**");
    }

    private static void checkMessagePermission(String permission) {
        StpUtil.checkLogin();
        StpUtil.checkRole(MESSAGE_USER_ROLE);
        StpUtil.checkPermission(permission);
    }
}
