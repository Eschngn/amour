package com.chengliuxiang.amour.common.constant;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 用户侧页面浏览采集与活跃度统计口径。
 *
 * <p>统计覆盖恋语间 Web 站点（Vue SPA）与微信小程序端的用户内容页面，
 * 不包含管理后台、登录页、静态资源与健康检查。</p>
 *
 * <p>渠道（客户端类型）由采集端自报，服务端只做白名单校验。
 * 它是统计维度，不是可信的身份或权限边界：客户端可以伪造该字段，
 * 因此不得用于鉴权、权限判断或任何业务放行逻辑。</p>
 */
public final class PageViewConstants {

    /**
     * 统计日期统一按北京时间切分，与前端日期标签保持一致。
     */
    public static final String TIME_ZONE = "Asia/Shanghai";

    /**
     * 渠道：Web 网页端。
     */
    public static final String CLIENT_TYPE_WEB = "web";

    /**
     * 渠道：微信小程序端。
     */
    public static final String CLIENT_TYPE_MINIPROGRAM = "miniprogram";

    /**
     * 旧版采集端未上报渠道时的兼容值。历史事件入库时没有渠道字段，
     * 迁移后统一按 Web 归类：无法从历史数据反推出真实小程序来源，
     * 因此不对历史记录做任何猜测性归属。
     */
    public static final String DEFAULT_CLIENT_TYPE = CLIENT_TYPE_WEB;

    /**
     * 渠道白名单，同时决定后台返回渠道的顺序（固定 Web、小程序）。
     */
    public static final List<String> SUPPORTED_CLIENT_TYPES = Collections.unmodifiableList(
            Arrays.asList(CLIENT_TYPE_WEB, CLIENT_TYPE_MINIPROGRAM));

    public static final String CLIENT_TYPE_WEB_TEXT = "Web 网页端";
    public static final String CLIENT_TYPE_MINIPROGRAM_TEXT = "微信小程序端";

    /**
     * 允许被统计的页面标识。前端只上报路由键，不上报完整 URL，
     * 服务端按白名单拒绝未知页面，避免事件表被写成任意数据入口。
     *
     * <p>Web 与小程序共用同一套页面键，保证两个渠道可按页面直接对比。</p>
     */
    public static final Set<String> SUPPORTED_PAGE_KEYS = Collections.unmodifiableSet(
            new LinkedHashSet<>(Arrays.asList(
                    "home",
                    "plaza",
                    "plaza_detail",
                    "space_setup",
                    "space_studio",
                    "story",
                    "story_detail",
                    "photo",
                    "photo_detail",
                    "message",
                    "anniversary",
                    "profile"
            )));

    /**
     * 单次后台查询允许的最大天数（含首尾）。
     */
    public static final int MAX_RANGE_DAYS = 90;

    /**
     * 未指定区间时默认展示近 7 天（含今天）。
     */
    public static final int DEFAULT_RANGE_DAYS = 7;

    /**
     * 事件保留天数。超过该窗口的数据由每日清理任务删除。
     */
    public static final int RETENTION_DAYS = 400;

    /**
     * 统计覆盖范围标识：Web 网页端 + 微信小程序端。
     */
    public static final String COVERAGE_WEB_AND_MINIPROGRAM = "web+miniprogram";

    /**
     * 单访客每分钟最多接收的页面浏览事件数。
     */
    public static final int MAX_EVENTS_PER_VISITOR_PER_MINUTE = 60;

    /**
     * 单 IP 每分钟最多接收的页面浏览事件数。
     *
     * <p>反向代理部署时，服务端看到的可能是代理地址，所有用户会共享这一个计数。
     * 因此该上限只作为粗粒度兜底，取值明显高于单访客上限；主要防刷依赖访客维度。</p>
     */
    public static final int MAX_EVENTS_PER_IP_PER_MINUTE = 3000;

    /**
     * 采集请求体大小上限（字节）。页面浏览只需要四个短字段。
     */
    public static final int MAX_EVENT_BODY_BYTES = 2048;

    public static boolean isSupportedPageKey(String pageKey) {
        return pageKey != null && SUPPORTED_PAGE_KEYS.contains(pageKey);
    }

    /**
     * 规范化渠道值：去空白、转小写；空值回落为 {@link #DEFAULT_CLIENT_TYPE}。
     *
     * @return 白名单内的渠道值；非法值返回 null，由调用方决定拒绝方式
     */
    public static String normalizeClientType(String rawClientType) {
        if (rawClientType == null) {
            return DEFAULT_CLIENT_TYPE;
        }
        String normalized = rawClientType.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return DEFAULT_CLIENT_TYPE;
        }
        return SUPPORTED_CLIENT_TYPES.contains(normalized) ? normalized : null;
    }

    public static boolean isSupportedClientType(String clientType) {
        return clientType != null && SUPPORTED_CLIENT_TYPES.contains(clientType);
    }

    /**
     * 渠道展示名称，供后台返回与前端图例使用。
     */
    public static String clientTypeText(String clientType) {
        if (CLIENT_TYPE_MINIPROGRAM.equals(clientType)) {
            return CLIENT_TYPE_MINIPROGRAM_TEXT;
        }
        if (CLIENT_TYPE_WEB.equals(clientType)) {
            return CLIENT_TYPE_WEB_TEXT;
        }
        return "";
    }

    private PageViewConstants() {
    }
}
