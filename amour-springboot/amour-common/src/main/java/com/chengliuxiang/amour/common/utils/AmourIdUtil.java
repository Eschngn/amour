package com.chengliuxiang.amour.common.utils;

import java.security.SecureRandom;

/**
 * 恋语 ID 生成工具。
 *
 * <p>恋语 ID 对外展示，使用 8 位随机数字并保证首位不为 0。
 * 数据库唯一索引是最终兜底，调用方仍需在冲突时重试。</p>
 */
public final class AmourIdUtil {

    private static final int AMOUR_ID_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private AmourIdUtil() {
    }

    public static String generate() {
        StringBuilder builder = new StringBuilder(AMOUR_ID_LENGTH);
        builder.append(RANDOM.nextInt(9) + 1);
        for (int i = 1; i < AMOUR_ID_LENGTH; i++) {
            builder.append(RANDOM.nextInt(10));
        }
        return builder.toString();
    }
}
