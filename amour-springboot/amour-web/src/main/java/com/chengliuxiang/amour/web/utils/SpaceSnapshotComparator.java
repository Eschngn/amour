package com.chengliuxiang.amour.web.utils;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 公开内容快照的规范化比较。
 *
 * <p>待审核快照与已发布快照都由同一组 builder 序列化，但历史数据可能来自不同版本，
 * 或因为配置行增删出现字段顺序、null / 空字符串差异。这里统一把 JSON 归一化为
 * 「键名排序、空值等价、文本去首尾空格、数字去尾零」的稳定字符串再比较，
 * 避免把等价内容误判为一次新的公开修改。</p>
 */
public final class SpaceSnapshotComparator {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * 空间快照里由系统维护、用户无法在首页编辑的字段。
     * 首次公开审核通过时 publicAt 才由系统写入，已发布快照可能仍是 null，
     * 但展示来源始终是 couple_space.public_at，因此比较时忽略，避免误报为内容变化。
     */
    private static final Set<String> SPACE_SYSTEM_FIELDS =
            Collections.unmodifiableSet(new HashSet<>(Collections.singletonList("publicAt")));

    /**
     * 已下线的内容颜色字段。历史发布快照可能仍保留这些键，比较时必须忽略，
     * 否则旧数据会永远被判为内容变化。
     */
    private static final Set<String> CONTENT_RETIRED_FIELDS =
            Collections.unmodifiableSet(new HashSet<>(java.util.Arrays.asList("colorCode", "tagColor")));

    /**
     * 日期 / 日期时间文本：统一成 yyyy-MM-dd HH:mm:ss。
     * 历史快照可能使用 ISO 的 T 分隔符或省略秒，不能因此误判成内容变化。
     */
    private static final Pattern DATE_TIME_PATTERN = Pattern.compile(
            "^(\\d{4}-\\d{2}-\\d{2})(?:[ T](\\d{2}):(\\d{2})(?::(\\d{2}))?)?$");

    private SpaceSnapshotComparator() {
    }

    /**
     * 当前工作快照是否与已发布快照一致。
     *
     * <p>任一快照缺失时返回 false，继续沿用「首次公开 / 新增内容」的现有语义。</p>
     */
    public static boolean isSame(String currentJson, String publishedJson) {
        return isSame(currentJson, publishedJson, CONTENT_RETIRED_FIELDS);
    }

    /** 空间信息快照比较：忽略系统维护字段，只比较用户可编辑内容。 */
    public static boolean isSameSpace(String currentJson, String publishedJson) {
        return isSame(currentJson, publishedJson, SPACE_SYSTEM_FIELDS);
    }

    private static boolean isSame(String currentJson, String publishedJson, Set<String> ignoredFields) {
        if (StrUtil.isBlank(currentJson) || StrUtil.isBlank(publishedJson)) {
            return false;
        }
        JsonNode current = readTree(currentJson);
        JsonNode published = readTree(publishedJson);
        if (current == null || published == null) {
            return Objects.equals(StrUtil.trim(currentJson), StrUtil.trim(publishedJson));
        }
        return canonicalize(current, true, ignoredFields)
                .equals(canonicalize(published, true, ignoredFields));
    }

    private static JsonNode readTree(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception exception) {
            return null;
        }
    }

    /** 递归生成与字段顺序无关的规范字符串；null 与空白字符串统一按空文本处理。 */
    private static String canonicalize(JsonNode node, boolean root, Set<String> ignoredFields) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return "\"\"";
        }
        if (node.isTextual()) {
            return quote(normalizeText(StrUtil.trimToEmpty(node.asText())));
        }
        if (node.isNumber()) {
            return canonicalNumber(node.decimalValue());
        }
        if (node.isBoolean()) {
            return node.asBoolean() ? "true" : "false";
        }
        if (node.isArray()) {
            List<String> values = new ArrayList<>();
            for (JsonNode child : node) {
                values.add(canonicalize(child, false, ignoredFields));
            }
            return "[" + String.join(",", values) + "]";
        }
        Map<String, String> fields = new TreeMap<>();
        Iterator<Map.Entry<String, JsonNode>> iterator = node.fields();
        while (iterator.hasNext()) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            if (root && ignoredFields.contains(entry.getKey())) {
                continue;
            }
            String value = canonicalize(entry.getValue(), false, ignoredFields);
            // 空字段不参与比较：缺失键与显式空值表示同一种展示状态。
            if ("\"\"".equals(value)) {
                continue;
            }
            fields.put(entry.getKey(), value);
        }
        // 时间展示精度是后加字段：历史快照缺失时按“展示日期和时间”兼容，
        // 避免旧公开内容因为补字段而被动产生一次无意义的重新审核。
        if (root && !ignoredFields.contains("showTime") && !fields.containsKey("showTime")) {
            fields.put("showTime", "true");
        }
        StringBuilder builder = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            if (!first) {
                builder.append(',');
            }
            builder.append(quote(entry.getKey())).append(':').append(entry.getValue());
            first = false;
        }
        return builder.append('}').toString();
    }

    private static String normalizeText(String text) {
        Matcher matcher = DATE_TIME_PATTERN.matcher(text);
        if (!matcher.matches()) {
            return text;
        }
        String date = matcher.group(1);
        if (matcher.group(2) == null) {
            return date + " 00:00:00";
        }
        String seconds = matcher.group(4) == null ? "00" : matcher.group(4);
        return date + " " + matcher.group(2) + ":" + matcher.group(3) + ":" + seconds;
    }

    private static String canonicalNumber(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        BigDecimal normalized = value.stripTrailingZeros();
        if (normalized.scale() < 0) {
            normalized = normalized.setScale(0);
        }
        return normalized.toPlainString();
    }

    private static String quote(String text) {
        String escaped = text.replace("\\", "\\\\").replace("\"", "\\\"");
        return "\"" + escaped + "\"";
    }
}
