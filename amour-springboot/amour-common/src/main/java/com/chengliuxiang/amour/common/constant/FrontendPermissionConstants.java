package com.chengliuxiang.amour.common.constant;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 前台功能展示权限。
 *
 * <p>平台已移除 Sa-Token 角色/权限校验，登录用户可使用全部前台模块。
 * 该集合仅用于向现有前端返回模块可见性，保持资料接口字段兼容。</p>
 */
public final class FrontendPermissionConstants {

    public static final Set<String> QUERY_PERMISSIONS = Collections.unmodifiableSet(
            new LinkedHashSet<>(Arrays.asList(
                    "frontend:story:query",
                    "frontend:photo:query",
                    "frontend:message:query",
                    "frontend:anniversary:query"
            )));

    private FrontendPermissionConstants() {
    }
}
