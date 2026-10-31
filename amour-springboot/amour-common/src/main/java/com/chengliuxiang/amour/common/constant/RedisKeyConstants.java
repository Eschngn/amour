package com.chengliuxiang.amour.common.constant;

public class RedisKeyConstants {

    /**
     * 一次性登录挑战 KEY 前缀
     */
    private static final String LOGIN_CHALLENGE_KEY_PREFIX = "login:challenge:";


    /** 微信用户对应本地用户 ID 的 KEY 前缀 */
    private static final String WECHAT_USER_KEY_PREFIX = "wechat:user:";

    /**
     * 构建一次性登录挑战 KEY
     */
    public static String buildLoginChallengeKey(String challengeId) {
        return LOGIN_CHALLENGE_KEY_PREFIX + challengeId;
    }

    public static String buildWechatUserKey(String openid) {
        return WECHAT_USER_KEY_PREFIX + openid;
    }

    /**
     * Sa-Token 登录的 Token KEY 前缀
     */
    public static final String SA_TOKEN_TOKEN_KEY_PREFIX = "Authorization:login:token:";
}
