package com.chengliuxiang.amour.common.service;

import cn.dev33.satoken.session.SaSession;
import cn.dev33.satoken.stp.StpInterface;
import cn.dev33.satoken.stp.StpUtil;
import com.chengliuxiang.amour.common.domain.mapper.UserRoleRelMapper;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.List;

/**
 * Sa-Token 角色和权限数据提供者。
 *
 * <p>角色关系保存在业务库中，登录成功后同步到 Sa-Token 账户 Session，
 * 因此 Redis 中的 Session 可直接用于后续授权判断。</p>
 */
@Component
public class SaTokenPermissionService implements StpInterface {

    @Resource
    private UserRoleRelMapper userRoleRelMapper;

    /**
     * 刷新当前登录用户的账户 Session 中的角色和权限。
     * 必须在 {@link StpUtil#login(Object)} 之后调用。
     */
    public void refreshSession(Object loginId) {
        Long userId = parseUserId(loginId);
        if (userId == null || !StpUtil.isLogin(userId)) {
            return;
        }
        SaSession session = StpUtil.getSessionByLoginId(userId, false);
        if (session == null) {
            return;
        }
        session.set(SaSession.ROLE_LIST, loadRoles(userId));
        session.set(SaSession.PERMISSION_LIST, loadPermissions(userId));
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        Long userId = parseUserId(loginId);
        return userId == null ? Collections.emptyList() : loadRoles(userId);
    }

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        Long userId = parseUserId(loginId);
        return userId == null ? Collections.emptyList() : loadPermissions(userId);
    }

    private List<String> loadRoles(Long userId) {
        List<String> roles = userRoleRelMapper.selectRoleKeys(userId);
        return roles == null ? Collections.emptyList() : roles;
    }

    private List<String> loadPermissions(Long userId) {
        List<String> permissions = userRoleRelMapper.selectPermissionKeys(userId);
        return permissions == null ? Collections.emptyList() : permissions;
    }

    private Long parseUserId(Object loginId) {
        if (loginId == null) {
            return null;
        }
        try {
            return Long.valueOf(String.valueOf(loginId));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
