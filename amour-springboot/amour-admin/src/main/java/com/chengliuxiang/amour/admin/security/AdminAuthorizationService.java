package com.chengliuxiang.amour.admin.security;

import cn.dev33.satoken.stp.StpUtil;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 后台权限校验。
 *
 * <p>后台不保存角色/权限表：{@code user.is_platform_admin = 1} 即平台管理员，
 * 拥有 {@link AdminPermissionConstants#ALL_PERMISSIONS} 中的全部治理权限。
 * 管理员账号由初始化 SQL 插入，禁用账号或非平台管理员一律 403。</p>
 *
 * <p>AdminTokenFilter 负责认证，本服务负责授权；前端菜单/按钮显隐只是体验，
 * 真正的边界是每次接口调用都重新校验数据库中的管理员标识。</p>
 */
@Service
public class AdminAuthorizationService {

    @Resource
    private UserMapper userMapper;

    public boolean hasPermission(String permissionKey) {
        return loadPermissions().contains(permissionKey);
    }

    public Set<String> currentPermissions() {
        return loadPermissions();
    }

    public void requirePermission(String permissionKey) {
        if (!hasPermission(permissionKey)) {
            throw new BizException(ResponseCodeEnum.FORBIDDEN);
        }
    }

    /**
     * 当前管理员是否拥有全部治理权限（仅用于前端提示，不作为授权边界）。
     */
    public boolean hasAllPermissions() {
        return loadPermissions().containsAll(AdminPermissionConstants.ALL_PERMISSIONS);
    }

    private Set<String> loadPermissions() {
        Long userId = StpUtil.getLoginIdAsLong();
        UserDO user = userMapper.selectActiveById(userId);
        if (user == null || !Boolean.TRUE.equals(user.getIsPlatformAdmin())) {
            throw new BizException(ResponseCodeEnum.FORBIDDEN);
        }
        return new LinkedHashSet<>(AdminPermissionConstants.ALL_PERMISSIONS);
    }
}
