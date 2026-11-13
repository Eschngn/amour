package com.chengliuxiang.amour.common.enums;


import com.chengliuxiang.amour.common.exception.BaseExceptionInterface;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @author Wilson
 * @Description: TODO
 * @date 2024/9/19 11:58
 */
@Getter
@AllArgsConstructor
public enum ResponseCodeEnum implements BaseExceptionInterface {
    // ----------- 通用异常状态码 -----------
    SYSTEM_ERROR("10000", "出错啦，后台小哥正在努力修复中..."),

    // ----------- 业务异常状态码 -----------
    PARAM_NOT_VALID("10001", "参数错误"),
    LOGIN_FAIL("20000", "登录失败"),
    USERNAME_OR_PWD_ERROR("20001", "用户名或密码错误"),
    UNAUTHORIZED("20002", "无访问权限，请先登录！"),
    STORY_NOT_EXIST("20003","故事节点不存在"),
    CHAPTER_NOT_EXIST("20004","章节不存在"),
    FILE_UPLOAD_FAILED("20005", "文件上传失败！"),
    MESSAGE_NOT_EXIST("20006", "留言不存在或已被删除"),
    MESSAGE_REPLY_NOT_EXIST("20007", "回复不存在或已被删除"),
    LOGIN_CHALLENGE_INVALID("20008", "登录验证已失效，请重新登录"),
    DICT_TYPE_NOT_EXIST("20009", "字典类型不存在或已删除"),
    DICT_ITEM_NOT_EXIST("20010", "字典项不存在或已删除"),
    DICT_TYPE_DUPLICATE("20011", "字典类型编码已存在"),
    DICT_ITEM_DUPLICATE("20012", "同一字典下的字典值已存在"),
    SITE_CONFIG_NOT_EXIST("20013", "配置不存在或已被删除"),
    SITE_CONFIG_DUPLICATE("20014", "配置键已存在"),
    USER_NOT_EXIST("20015", "用户不存在或已被删除"),
    USERNAME_ALREADY_EXISTS("20016", "该用户名已被使用"),
    CURRENT_PASSWORD_ERROR("20017", "当前密码不正确"),
    NEW_PASSWORD_SAME("20018", "新密码不能与当前密码相同"),
    AVATAR_FORMAT_INVALID("20019", "头像仅支持 JPG、PNG、WebP 或 GIF，且不能超过 5MB"),
    NEW_PASSWORD_FORMAT_INVALID("20020", "新密码长度需为 6-64 个字符"),
    PHOTO_NOT_EXIST("20021", "照片不存在或已被删除"),
    PHOTO_CATEGORY_NOT_EXIST("20022", "照片分类不存在"),
    PHOTO_CATEGORY_DUPLICATE("20023", "照片分类名称已存在"),
    PHOTO_CATEGORY_IN_USE("20024", "该照片分类下仍有照片，无法删除"),
    ANNIVERSARY_NOT_EXIST("20025", "纪念日不存在或已被删除"),
    MESSAGE_DELETE_FORBIDDEN("20026", "只能删除自己发布的留言"),
    MESSAGE_REPLY_DELETE_FORBIDDEN("20027", "只能删除自己发布的回复"),
    WECHAT_LOGIN_FAILED("20028", "微信登录失败，请稍后重试"),
    WECHAT_CONFIG_INVALID("20029", "微信登录配置不完整"),
    USERNAME_CHANGE_TOO_FREQUENT("20030", "用户名修改后 30 天内不能再次修改"),
    FORBIDDEN("20031", "无权限执行此操作"),
    SPACE_NOT_EXIST("20032", "情侣空间不存在"),
    SPACE_ALREADY_EXISTS("20033", "你已经加入了一个情侣空间"),
    SPACE_NOT_MEMBER("20034", "你不是该情侣空间的成员"),
    SPACE_STATUS_NOT_ALLOWED("20035", "当前空间状态不允许此操作"),
    SPACE_MEMBER_LIMIT("20036", "情侣空间成员人数已达上限"),
    SPACE_CREATE_FAILED("20037", "创建情侣空间失败，请稍后重试"),
    USER_ALREADY_IN_SPACE("20038", "该账号已加入其他情侣空间，无法重复加入"),
    ALREADY_SPACE_MEMBER("20039", "你已经是该情侣空间的成员"),
    INVITATION_NOT_EXIST("20040", "邀请不存在或链接已失效"),
    INVITATION_EXPIRED("20041", "邀请已过期"),
    INVITATION_NOT_PENDING("20042", "邀请已被撤销或已处理"),
    INVITATION_ALREADY_ACCEPTED("20043", "邀请已被接受"),
    INVITATION_FORBIDDEN("20044", "无权处理该邀请"),
    RESTORE_NOT_REQUIRED("20045", "当前空间无需恢复"),
    SPACE_NOT_PUBLIC("20046", "该情侣空间未公开"),
    SPACE_FROZEN("20047", "该情侣空间已冻结"),
    SPACE_ARCHIVED("20048", "该情侣空间已归档"),
    SPACE_NOT_ACCESSIBLE("20049", "该情侣空间当前不可访问"),
    SPACE_LEAVE_REQUIRES_RESTORE("20051", "冻结或归档的空间需先恢复才能解绑"),
    SPACE_FROZEN_OR_ARCHIVED_NOT_PUBLIC("20052", "冻结或归档的空间不能公开"),
    SPACE_NOT_TWO_MEMBERS("20053", "情侣空间尚未完成两人绑定，不能公开"),
    SPACE_UNBIND_ALREADY_PENDING("20054", "已有待处理的解绑申请"),
    SPACE_UNBIND_NOT_PENDING("20055", "没有待处理的解绑申请"),
    SPACE_UNBIND_NOT_PARTNER("20056", "只有另一方成员可以处理解绑申请"),
    SPACE_UNBIND_ALREADY_RESOLVED("20057", "解绑申请已处理"),
    SPACE_UNBOUND("20058", "情侣空间已完成解绑"),
    SPACE_UNBIND_NOT_REQUESTER("20059", "当前用户不是解绑申请发起人"),
    SPACE_UNBIND_CANNOT_CANCEL("20060", "当前用户不能取消该解绑申请"),
    SPACE_RESTORE_NOT_ALLOWED("20061", "只有双方已解绑的情侣空间才能人工恢复"),
    SPACE_RESTORE_MEMBER_INVALID("20062", "情侣空间历史成员不完整或仍处于有效状态，无法人工恢复"),
    SPACE_UNBIND_REQUIRES_PARTNER("20063", "另一半加入后才能申请解绑"),
    SPACE_UPDATE_NOT_ALLOWED("20064", "只有等待另一半加入时才能编辑空间信息"),
    SPACE_CONTENT_EDIT_NOT_ALLOWED("20065", "当前空间状态或成员身份不允许编辑内容"),
    SPACE_HOME_CONFIG_KEY_NOT_ALLOWED("20066", "不支持的空间首页配置项"),
    SPACE_CONTENT_NOT_IN_SPACE("20067", "内容不属于当前情侣空间"),
    SPACE_CHAPTER_NOT_EMPTY("20068", "章节下仍有故事，无法删除"),
    SPACE_CONTENT_PUBLISH_NOT_ALLOWED("20069", "空间完成两人绑定后才能公开内容"),
    SPACE_IMAGE_INVALID("20070", "图片仅支持 JPG、PNG、WebP 或 GIF，且不能超过 5MB"),
    CHAPTER_NAME_DUPLICATE("20071", "章节名称已存在"),
    CONTENT_TYPE_NOT_SUPPORTED("20072", "不支持的内容类型"),
    CONTENT_NOT_IN_SPACE("20073", "内容不存在或不属于所请求的情侣空间"),
    CONTENT_CROSS_SPACE_FORBIDDEN("20074", "缺少跨空间查询权限，请先选择情侣空间"),
    CONTENT_OPERATION_NOT_SUPPORTED("20075", "该内容类型不支持此治理操作"),
    CONTENT_ALREADY_DELETED("20076", "内容已被逻辑删除"),
    REASON_REQUIRED("20077", "请填写操作原因"),
    REPORT_NOT_EXIST("20078", "举报不存在"),
    REPORT_TARGET_NOT_PUBLIC("20079", "只能举报已公开的情侣空间或公开内容"),
    REPORT_DUPLICATE("20080", "你已举报过该内容，平台正在处理"),
    REPORT_SUBMIT_TOO_FREQUENT("20081", "举报提交过于频繁，请稍后再试"),
    REPORT_ALREADY_PROCESSED("20082", "举报已被其他管理员处理"),
    REPORT_ACTION_NOT_SUPPORTED("20083", "不支持的举报处理动作"),
    AUDIT_LOG_NOT_SUPPORTED("20084", "操作审计记录失败"),
    PAGE_VIEW_EVENT_INVALID("20085", "页面浏览上报无效"),
    PAGE_VIEW_TOO_FREQUENT("20086", "页面浏览上报过于频繁，请稍后再试"),
    ACTIVITY_RANGE_INVALID("20087", "统计区间不合法，请检查开始和结束日期"),
    ACTIVITY_RANGE_TOO_LARGE("20088", "统计区间最长支持90天"),
    SPACE_MEMBERSHIP_CONFLICT("20089", "该账号存在多个有效情侣空间，请先处理空间冲突后再操作"),
    SPACE_RESTORE_CONFLICT("20090", "存在无法自动处理的冲突空间，请先处理后再恢复"),

    ;

    // 异常码
    private String errorCode;
    // 错误信息
    private String errorMessage;
}
