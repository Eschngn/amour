package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 当前登录管理员的有效权限，供前端菜单/路由/按钮显隐使用。
 * 该接口只返回权限键，不返回角色或用户敏感字段。
 */
@RestController
@RequestMapping("/admin/auth")
public class AdminAuthController {

    @Resource
    private AdminAuthorizationService adminAuthorizationService;

    @PostMapping("/permissions")
    public Response<Map<String, Object>> permissions() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("permissions", adminAuthorizationService.currentPermissions());
        data.put("allPermissions", adminAuthorizationService.hasAllPermissions());
        return Response.success(data);
    }
}
