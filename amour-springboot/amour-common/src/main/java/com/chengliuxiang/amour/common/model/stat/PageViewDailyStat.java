package com.chengliuxiang.amour.common.model.stat;

import lombok.Data;

/**
 * 按日聚合的页面浏览结果。
 */
@Data
public class PageViewDailyStat {

    /**
     * 统计日期 yyyy-MM-dd（Asia/Shanghai）。
     */
    private String viewDate;

    /**
     * 当日有效页面浏览次数。
     */
    private Long pv;

    /**
     * 当日去重访客数。
     */
    private Long uv;
}
