package com.chengliuxiang.amour.common.constant;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 后台细粒度权限键。
 *
 * <p>菜单、路由 meta、按钮显隐、后端校验和初始化 SQL 必须使用同一组键。
 * 前端隐藏只用于体验，真正的授权边界在服务端。</p>
 */
public final class AdminPermissionConstants {

    public static final String DASHBOARD_QUERY = "admin:dashboard:query";

    public static final String SPACE_QUERY = "admin:space:query";
    public static final String SPACE_RESTORE = "admin:space:restore";

    public static final String CONTENT_QUERY = "admin:content:query";
    public static final String CONTENT_CROSS_SPACE = "admin:content:cross-space";
    public static final String CONTENT_MODERATE = "admin:content:moderate";
    public static final String CONTENT_DELETE = "admin:content:delete";

    public static final String REPORT_QUERY = "admin:report:query";
    public static final String REPORT_PROCESS = "admin:report:process";

    public static final String USER_QUERY = "admin:user:query";
    public static final String USER_UPDATE = "admin:user:update";
    public static final String USER_DISABLE = "admin:user:disable";

    public static final String AUDIT_QUERY = "admin:audit:query";

    public static final String DICT_QUERY = "admin:dict:query";
    public static final String DICT_UPDATE = "admin:dict:update";
    public static final String DICT_DELETE = "admin:dict:delete";

    /**
     * 兼容旧版后台菜单/按钮使用的权限键。
     */
    public static final Set<String> LEGACY_ADMIN_PERMISSIONS = Collections.unmodifiableSet(
            new LinkedHashSet<>(Arrays.asList(
                    "admin:story:menu", "admin:story:query", "admin:story:create",
                    "admin:story:update", "admin:story:delete",
                    "admin:message:menu", "admin:message:query", "admin:message:create",
                    "admin:message:update", "admin:message:delete",
                    "admin:photo:menu", "admin:photo:query", "admin:photo:create",
                    "admin:photo:update", "admin:photo:delete",
                    "admin:anniversary:menu", "admin:anniversary:query",
                    "admin:anniversary:create", "admin:anniversary:update",
                    "admin:anniversary:delete",
                    "admin:dict:menu", "admin:dict:create",
                    "admin:user:menu", "admin:user:create", "admin:user:delete",
                    "admin:space:menu"
            )));

    /**
     * 平台管理员可用的全部治理权限键。后台不保存角色/权限表，
     * is_platform_admin=1 的用户直接获得该集合。
     */
    public static final Set<String> ALL_PERMISSIONS = Collections.unmodifiableSet(
            new LinkedHashSet<>(Arrays.asList(
                    "admin:dashboard:menu", DASHBOARD_QUERY,
                    "admin:space:menu", SPACE_QUERY, SPACE_RESTORE,
                    "admin:content:menu", CONTENT_QUERY, CONTENT_CROSS_SPACE,
                    CONTENT_MODERATE, CONTENT_DELETE,
                    "admin:report:menu", REPORT_QUERY, REPORT_PROCESS,
                    "admin:user:menu", USER_QUERY, USER_UPDATE, USER_DISABLE,
                    "admin:audit:menu", AUDIT_QUERY,
                    "admin:dict:menu", DICT_QUERY, DICT_UPDATE, DICT_DELETE,
                    "admin:story:menu", "admin:story:query", "admin:story:create",
                    "admin:story:update", "admin:story:delete",
                    "admin:message:menu", "admin:message:query", "admin:message:create",
                    "admin:message:update", "admin:message:delete",
                    "admin:photo:menu", "admin:photo:query", "admin:photo:create",
                    "admin:photo:update", "admin:photo:delete",
                    "admin:anniversary:menu", "admin:anniversary:query",
                    "admin:anniversary:create", "admin:anniversary:update",
                    "admin:anniversary:delete"
            )));

    private AdminPermissionConstants() {
    }
}
