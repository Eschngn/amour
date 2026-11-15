package com.chengliuxiang.amour.web.utils;

import cn.hutool.core.util.StrUtil;

import java.util.regex.Pattern;

/**
 * 公开故事列表的正文摘要工具。
 *
 * <p>恋爱广场空间详情只展示故事摘要，不能把完整正文截断后原样返回。
 * 这里先把常见 Markdown 标记转成可读纯文本，再按字符上限截断，
 * 保证匿名访客拿到的 preview 既简短又不含代码块、图片语法等噪声。</p>
 */
public final class GalleryStoryPreviewUtil {

    /** 列表预览默认字符上限。 */
    public static final int DEFAULT_PREVIEW_LENGTH = 160;

    private static final String ELLIPSIS = "…";

    /** 围栏代码块整体移除，避免长代码挤占预览。 */
    private static final Pattern FENCED_CODE = Pattern.compile("(?s)```.*?```");
    /** 行内代码保留内容、去掉反引号。 */
    private static final Pattern INLINE_CODE = Pattern.compile("`([^`\\n]*)`");
    /** 图片语法只保留 alt 文本，避免把图片地址写进摘要。 */
    private static final Pattern IMAGE = Pattern.compile("!\\[([^\\]]*)\\]\\([^)]*\\)");
    /** 普通链接只保留链接文字。 */
    private static final Pattern LINK = Pattern.compile("\\[([^\\]]*)\\]\\([^)]*\\)");
    private static final Pattern AUTOLINK = Pattern.compile("<(https?://[^>\\s]+)>");
    private static final Pattern HTML_TAG = Pattern.compile("</?[a-zA-Z][^>]*>");
    private static final Pattern HEADING = Pattern.compile("(?m)^\\s{0,3}#{1,6}\\s*");
    private static final Pattern BLOCKQUOTE = Pattern.compile("(?m)^\\s{0,3}(?:>\\s?)+");
    private static final Pattern LIST_MARKER = Pattern.compile("(?m)^\\s{0,3}(?:[-*+]|\\d{1,9}[.)])\\s+");
    private static final Pattern HORIZONTAL_RULE = Pattern.compile("(?m)^\\s{0,3}([-*_])(?:\\s*\\1){2,}\\s*$");
    /** 表格分隔行（| --- | --- |）整体移除。 */
    private static final Pattern TABLE_DIVIDER = Pattern.compile(
            "(?m)^\\s*\\|?\\s*:?-{3,}:?\\s*(?:\\|\\s*:?-{3,}:?\\s*)+\\|?\\s*$");
    private static final Pattern TABLE_PIPE = Pattern.compile("\\|");
    private static final Pattern EMPHASIS = Pattern.compile("\\*\\*|__|~~|\\*|_");
    private static final Pattern ESCAPED_CHAR = Pattern.compile("\\\\([\\\\`*_{}\\[\\]()#+\\-.!>])");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private GalleryStoryPreviewUtil() {
    }

    /**
     * 生成默认长度的正文预览。
     */
    public static String buildPreview(String content) {
        return buildPreview(content, DEFAULT_PREVIEW_LENGTH);
    }

    /**
     * 生成不超过 maxLength 个字符的正文预览。
     *
     * <p>截断时预留一个省略号位置，确保返回值长度始终不超过上限；
     * 预览为空时返回空字符串，由前端展示“还没有正文”。</p>
     */
    public static String buildPreview(String content, int maxLength) {
        if (maxLength <= 0) {
            return "";
        }
        String plainText = toPlainText(content);
        if (plainText.length() <= maxLength) {
            return plainText;
        }
        int cutIndex = Math.max(0, maxLength - ELLIPSIS.length());
        String head = plainText.substring(0, cutIndex).trim();
        return head.isEmpty() ? ELLIPSIS : head + ELLIPSIS;
    }

    /**
     * 计算去除空白后的正文长度，与用户端故事详情的字数口径保持一致。
     */
    public static int countContentLength(String content) {
        if (StrUtil.isEmpty(content)) {
            return 0;
        }
        int count = 0;
        for (int index = 0; index < content.length(); index++) {
            if (!Character.isWhitespace(content.charAt(index))) {
                count++;
            }
        }
        return count;
    }

    /**
     * 正文去除空白后是否仍有内容。
     */
    public static boolean hasContent(String content) {
        return countContentLength(content) > 0;
    }

    /**
     * 将 Markdown 转为单行纯文本，供摘要预览使用。
     */
    public static String toPlainText(String content) {
        if (StrUtil.isBlank(content)) {
            return "";
        }
        String text = content;
        text = FENCED_CODE.matcher(text).replaceAll(" ");
        text = IMAGE.matcher(text).replaceAll("$1");
        text = LINK.matcher(text).replaceAll("$1");
        text = AUTOLINK.matcher(text).replaceAll("$1");
        text = HTML_TAG.matcher(text).replaceAll(" ");
        text = INLINE_CODE.matcher(text).replaceAll("$1");
        text = HEADING.matcher(text).replaceAll("");
        text = BLOCKQUOTE.matcher(text).replaceAll("");
        text = HORIZONTAL_RULE.matcher(text).replaceAll(" ");
        text = TABLE_DIVIDER.matcher(text).replaceAll(" ");
        text = LIST_MARKER.matcher(text).replaceAll("");
        text = TABLE_PIPE.matcher(text).replaceAll(" ");
        text = EMPHASIS.matcher(text).replaceAll("");
        text = ESCAPED_CHAR.matcher(text).replaceAll("$1");
        text = WHITESPACE.matcher(text).replaceAll(" ");
        return text.trim();
    }
}
