package com.chengliuxiang.amour.common.constant;

public class RedisKeyConstants {

    /**
     * 一次性登录挑战 KEY 前缀
     */
    private static final String LOGIN_CHALLENGE_KEY_PREFIX = "login:challenge:";


    /**
     * 用户对应角色集合 KEY 前缀
     */
    private static final String USER_ROLES_KEY_PREFIX = "user:roles:";

    /**
     * 角色对应的权限集合 KEY 前缀
     */
    private static final String ROLE_PERMISSIONS_KEY_PREFIX = "role:permissions:";

    /**
     * 构建角色对应的权限集合 KEY
     * @param roleKey
     * @return
     */
    public static String buildRolePermissionsKey(String roleKey) {
        return ROLE_PERMISSIONS_KEY_PREFIX + roleKey;
    }

    /**
     * 构建用户-角色 KEY
     * @param userId
     * @return
     */
    public static String buildUserRoleKey(Long userId) {
        return USER_ROLES_KEY_PREFIX + userId;
    }

    /**
     * 构建一次性登录挑战 KEY
     */
    public static String buildLoginChallengeKey(String challengeId) {
        return LOGIN_CHALLENGE_KEY_PREFIX + challengeId;
    }

    /**
     * Sa-Token 登录的 Token KEY 前缀
     */
    public static final String SA_TOKEN_TOKEN_KEY_PREFIX = "Authorization:login:token:";
}
