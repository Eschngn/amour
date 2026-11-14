package com.chengliuxiang.amour.common.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class JsonUtil {

    private static final ObjectMapper INSTANCE = new ObjectMapper();

    public static String toJsonString(Object obj) {
        try {
            return INSTANCE.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return obj.toString();
        }
    }

    /**
     * 解析审核快照。快照结构只包含字符串、数字、布尔与集合，不依赖 Java 8 时间模块。
     */
    public static <T> T parseObject(String json, Class<T> clazz) {
        if (json == null || json.trim().isEmpty()) {
            return null;
        }
        try {
            return INSTANCE.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            log.warn("审核快照解析失败，type: {}", clazz.getSimpleName(), e);
            return null;
        }
    }
}
