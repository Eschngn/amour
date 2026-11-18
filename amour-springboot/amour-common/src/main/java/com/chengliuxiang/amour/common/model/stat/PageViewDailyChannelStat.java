package com.chengliuxiang.amour.common.model.stat;

import lombok.Data;

/**
 * 按日期 + 渠道聚合的页面浏览结果。
 *
 * <p>{@code pv} 为当日该渠道的有效浏览次数；{@code uv} 为当日该渠道去重访客数。
 * 每日 UV 不能相加得到区间 UV。</p>
 */
@Data
public class PageViewDailyChannelStat {

    /**
     * 统计日期 yyyy-MM-dd（Asia/Shanghai）。
     */
    private String viewDate;

    /**
     * 访问渠道：web / miniprogram。历史记录迁移后为 web。
     */
    private String clientType;

    /**
     * 当日该渠道有效页面浏览次数。
     */
    private Long pv;

    /**
     * 当日该渠道去重访客数。
     */
    private Long uv;
}
