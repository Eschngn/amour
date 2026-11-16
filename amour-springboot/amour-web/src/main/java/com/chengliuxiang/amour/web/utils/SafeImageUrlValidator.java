package com.chengliuxiang.amour.web.utils;

import cn.hutool.core.util.StrUtil;

import java.util.regex.Pattern;

/**
 * 图片地址安全校验：只允许 http(s) 绝对地址或站内绝对路径，拒绝空白与脚本类协议。
 */
public final class SafeImageUrlValidator {

    private static final Pattern SAFE_IMAGE_URL = Pattern.compile("^(https?://|/)[^\\s]*$",
            Pattern.CASE_INSENSITIVE);

    private SafeImageUrlValidator() {
    }

    public static boolean isValid(String url) {
        return StrUtil.isNotBlank(url) && SAFE_IMAGE_URL.matcher(url.trim()).matches();
    }
}
