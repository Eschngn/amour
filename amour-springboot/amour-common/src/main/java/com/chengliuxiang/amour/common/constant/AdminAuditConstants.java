package com.chengliuxiang.amour.common.constant;

/**
 * 后台审计动作与目标类型。
 *
 * <p>审计只记录操作元数据，不记录内容正文、密码、openid 或邀请明文 token。</p>
 */
public final class AdminAuditConstants {

    public static final String TARGET_SPACE = "space";
    public static final String TARGET_CONTENT = "content";
    public static final String TARGET_USER = "user";
    public static final String TARGET_REPORT = "report";
    public static final String TARGET_DICT = "dict";
    public static final String TARGET_ADMIN = "admin";

    public static final String ACTION_SPACE_VIEW = "SPACE_VIEW";
    public static final String ACTION_SPACE_DETAIL_VIEW = "SPACE_DETAIL_VIEW";
    public static final String ACTION_SPACE_RESTORE = "SPACE_RESTORE";
    public static final String ACTION_SPACE_SET_PRIVATE = "SPACE_SET_PRIVATE";

    public static final String ACTION_CONTENT_VIEW = "CONTENT_VIEW";
    public static final String ACTION_CONTENT_VISIBILITY = "CONTENT_VISIBILITY";
    public static final String ACTION_CONTENT_DELETE = "CONTENT_DELETE";

    public static final String ACTION_REPORT_PROCESS = "REPORT_PROCESS";
    public static final String ACTION_REPORT_VIEW = "REPORT_VIEW";

    public static final String ACTION_USER_DISABLE = "USER_DISABLE";
    public static final String ACTION_USER_UPDATE = "USER_UPDATE";

    public static final String ACTION_DICT_WRITE = "DICT_WRITE";
    public static final String ACTION_ADMIN_PERMISSION_CHANGE = "ADMIN_PERMISSION_CHANGE";

    public static final String RESULT_SUCCESS = "SUCCESS";
    public static final String RESULT_FAILURE = "FAILURE";

    private AdminAuditConstants() {
    }
}
