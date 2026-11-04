package com.chengliuxiang.amour.common.utils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 日志脱敏工具。
 *
 * <p>邀请令牌、登录密码密文等凭证只应出现在响应体中，不允许以明文写入应用日志。
 * 统一在日志切面出口做一次掩码，避免各控制器重复处理。</p>
 */
public final class LogSensitiveMasker {

    /**
     * 掩码占位符。
     */
    public static final String MASK = "******";

    /**
     * JSON 形态：{"token":"xxx"}。
     */
    private static final Pattern JSON_FIELD_PATTERN = Pattern.compile(
            "(\"(?:token|tokenHash|encryptedPassword|password|privateKey|secretKey|accessKey)\"\\s*:\\s*\")([^\"]*)(\")");

    /**
     * Lombok toString / 查询串形态：token=xxx,
     */
    private static final Pattern TEXT_FIELD_PATTERN = Pattern.compile(
            "((?:token|encryptedPassword|password|privateKey|secretKey|accessKey)=)([^,)\\s]+)");

    private LogSensitiveMasker() {
    }

    /**
     * 对文本中的敏感字段值做掩码，保留字段名便于排查问题。
     *
     * @param text 原始日志文本，允许为 null
     * @return 脱敏后的文本
     */
    public static String mask(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        return maskTextField(maskJsonField(text));
    }

    private static String maskJsonField(String text) {
        Matcher matcher = JSON_FIELD_PATTERN.matcher(text);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String value = matcher.group(2);
            String replacement = value.isEmpty()
                    ? matcher.group(0)
                    : matcher.group(1) + MASK + matcher.group(3);
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private static String maskTextField(String text) {
        Matcher matcher = TEXT_FIELD_PATTERN.matcher(text);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String replacement = matcher.group(1) + MASK;
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }
}
