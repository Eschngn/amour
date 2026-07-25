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


    ;

    // 异常码
    private String errorCode;
    // 错误信息
    private String errorMessage;
}
