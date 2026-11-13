package com.chengliuxiang.amour.common.constant;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 用户侧页面浏览采集与活跃度统计口径。
 *
 * <p>首期只统计恋语间 Web 站点（Vue SPA）的用户内容页面，
 * 不包含微信小程序、管理后台、静态资源与健康检查。</p>
 */
public final class PageViewConstants {

    /**
     * 统计日期统一按北京时间切分，与前端日期标签保持一致。
     */
    public static final String TIME_ZONE = "Asia/Shanghai";

    /**
     * 允许被统计的页面标识。前端只上报路由键，不上报完整 URL，
     * 服务端按白名单拒绝未知页面，避免事件表被写成任意数据入口。
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
                    "message",
                    "photo",
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
     * 统计覆盖范围标识，后台页面按该值展示“仅 Web SPA”说明。
     */
    public static final String COVERAGE_WEB_SPA = "web-spa";

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
     * 采集请求体大小上限（字节）。页面浏览只需要三个短字段。
     */
    public static final int MAX_EVENT_BODY_BYTES = 2048;

    public static boolean isSupportedPageKey(String pageKey) {
        return pageKey != null && SUPPORTED_PAGE_KEYS.contains(pageKey);
    }

    private PageViewConstants() {
    }
}
