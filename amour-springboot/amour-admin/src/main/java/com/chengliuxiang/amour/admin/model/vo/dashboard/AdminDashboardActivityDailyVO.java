package com.chengliuxiang.amour.admin.model.vo.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 活跃度趋势中的一天（全部渠道合计 + 分渠道明细）。
 *
 * <p>{@code pv}/{@code uv} 为两个渠道合计；{@code webPv}/{@code webUv} 与
 * {@code miniprogramPv}/{@code miniprogramUv} 为该日各渠道的独立统计。
 * 每日 UV 是当日去重值，不能相加得到区间 UV。</p>
 *
 * <p>渠道字段始终返回，没有数据时为 0，不隐藏渠道。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardActivityDailyVO {

    /**
     * 日期 yyyy-MM-dd（Asia/Shanghai）。
     */
    private String date;

    /**
     * 当日全部渠道浏览次数合计。
     */
    private Long pv;

    /**
     * 当日全部渠道去重访客数。
     */
    private Long uv;

    /**
     * 当日 Web 网页端浏览次数。
     */
    private Long webPv;

    /**
     * 当日 Web 网页端去重访客数。
     */
    private Long webUv;

    /**
     * 当日微信小程序端浏览次数。
     */
    private Long miniprogramPv;

    /**
     * 当日微信小程序端去重访客数。
     */
    private Long miniprogramUv;
}
