package com.chengliuxiang.amour.admin.filter;

import cn.dev33.satoken.stp.StpUtil;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.utils.JsonUtil;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.annotation.Resource;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Slf4j
@Component
public class AdminTokenFilter extends OncePerRequestFilter {

    @Resource
    private UserMapper userMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // 只拦截 /admin/ 开头的请求，但排除登录及登录挑战接口
        return !path.startsWith("/admin/")
                || path.equals("/admin/login")
                || path.equals("/admin/login/challenge");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (StpUtil.isLogin()) {
            UserDO user = userMapper.selectActiveById(StpUtil.getLoginIdAsLong());
            // 平台管理员由 user.is_platform_admin 标识，不再依赖角色和权限表。
            if (user != null && Boolean.TRUE.equals(user.getIsPlatformAdmin())) {
                chain.doFilter(request, response);
                return;
            }
        }
        log.warn("Token invalid or expired, uri: {}", request.getRequestURI());
        writeUnAuthResponse(response);
    }

    private void writeUnAuthResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=utf-8");
        response.getWriter().write(JsonUtil.toJsonString(Response.fail(ResponseCodeEnum.UNAUTHORIZED)));
    }
}
