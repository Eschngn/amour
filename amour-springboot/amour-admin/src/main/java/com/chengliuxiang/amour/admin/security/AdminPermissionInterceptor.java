package com.chengliuxiang.amour.admin.security;

import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.JsonUtil;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 后台授权拦截器。
 *
 * <p>按请求路径映射到统一权限键，未映射的后台路径一律拒绝，避免新增接口忘记加权限。
 * 前端菜单/按钮隐藏只用于体验，真正的边界在这里。</p>
 */
@Component
@Slf4j
public class AdminPermissionInterceptor implements HandlerInterceptor {

    @Resource
    private AdminAuthorizationService authorizationService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        String permissionKey = resolvePermissionKey(path);
        if (permissionKey == null) {
            log.warn("后台路径未配置权限映射，拒绝访问: {}", path);
            writeForbidden(response);
            return false;
        }
        try {
            authorizationService.requirePermission(permissionKey);
            return true;
        } catch (BizException exception) {
            log.warn("管理员权限不足，uri: {}, permission: {}", path, permissionKey);
            writeForbidden(response);
            return false;
        }
    }

    /**
     * 权限键映射。所有 /admin 业务接口都必须在这里登记。
     */
    static String resolvePermissionKey(String path) {
        if (path == null || !path.startsWith("/admin/")) {
            return null;
        }
        if (path.equals("/admin/logout") || path.equals("/admin/auth/permissions")) {
            return ""; // 只要求已登录，由空字符串表示无需额外权限
        }
        if (path.startsWith("/admin/dashboard/")) {
            return AdminPermissionConstants.DASHBOARD_QUERY;
        }
        if (path.startsWith("/admin/space/list") || path.startsWith("/admin/space/detail")) {
            return AdminPermissionConstants.SPACE_QUERY;
        }
        if (path.startsWith("/admin/space/restore")) {
            return AdminPermissionConstants.SPACE_RESTORE;
        }
        if (path.startsWith("/admin/space-review/list") || path.startsWith("/admin/space-review/detail")) {
            return AdminPermissionConstants.SPACE_REVIEW_QUERY;
        }
        if (path.startsWith("/admin/space-review/approve")
                || path.startsWith("/admin/space-review/reject")
                || path.startsWith("/admin/space-review/item/")
                || path.startsWith("/admin/space-review/unpublish")) {
            return AdminPermissionConstants.SPACE_REVIEW_PROCESS;
        }
        if (path.startsWith("/admin/audit/list")) {
            return AdminPermissionConstants.AUDIT_QUERY;
        }
        if (path.startsWith("/admin/user/list")) {
            return AdminPermissionConstants.USER_QUERY;
        }
        if (path.startsWith("/admin/user/save")) {
            return AdminPermissionConstants.USER_UPDATE;
        }
        if (path.startsWith("/admin/user/delete")) {
            return AdminPermissionConstants.USER_DISABLE;
        }
        if (path.startsWith("/admin/content/")) {
            if (path.startsWith("/admin/content/detail") || path.startsWith("/admin/content/list")) {
                return AdminPermissionConstants.CONTENT_QUERY;
            }
            if (path.startsWith("/admin/content/moderate")) {
                return AdminPermissionConstants.CONTENT_MODERATE;
            }
            if (path.startsWith("/admin/content/delete")) {
                return AdminPermissionConstants.CONTENT_DELETE;
            }
            return AdminPermissionConstants.CONTENT_QUERY;
        }
        if (path.startsWith("/admin/story/list") || path.startsWith("/admin/story/detail")
                || path.startsWith("/admin/photo/list") || path.startsWith("/admin/photo/category/list")
                || path.startsWith("/admin/anniversary/list") || path.startsWith("/admin/anniversary/detail")
                || path.startsWith("/admin/message/list")
                || path.startsWith("/admin/chapter/")) {
            return AdminPermissionConstants.CONTENT_QUERY;
        }
        if (path.startsWith("/admin/story/updatePublishStatus")
                || path.startsWith("/admin/photo/updateVisibleStatus")
                || path.startsWith("/admin/anniversary/updateVisibleStatus")
                || path.startsWith("/admin/file/upload")) {
            return AdminPermissionConstants.CONTENT_MODERATE;
        }
        if (path.startsWith("/admin/story/delete") || path.startsWith("/admin/photo/delete")
                || path.startsWith("/admin/anniversary/delete") || path.startsWith("/admin/message/delete")) {
            return AdminPermissionConstants.CONTENT_DELETE;
        }
        if (path.startsWith("/admin/story/add") || path.startsWith("/admin/story/update")
                || path.startsWith("/admin/photo/add") || path.startsWith("/admin/photo/update")) {
            // 旧代编辑接口已下线；保留映射以便返回明确拒绝。
            return AdminPermissionConstants.CONTENT_MODERATE;
        }
        if (path.startsWith("/admin/dict/")) {
            if (path.endsWith("/list")) {
                return AdminPermissionConstants.DICT_QUERY;
            }
            if (path.endsWith("/delete")) {
                return AdminPermissionConstants.DICT_DELETE;
            }
            return AdminPermissionConstants.DICT_UPDATE;
        }
        return null;
    }

    private void writeForbidden(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=utf-8");
        response.getWriter().write(JsonUtil.toJsonString(Response.fail(ResponseCodeEnum.FORBIDDEN)));
    }
}
