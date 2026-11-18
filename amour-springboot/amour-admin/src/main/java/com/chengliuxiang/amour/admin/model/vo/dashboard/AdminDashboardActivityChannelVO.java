package com.chengliuxiang.amour.admin.model.vo.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 单个访问渠道的区间活跃度。
 *
 * <p>区间 UV 按该渠道整段去重，不是每日 UV 或各渠道 UV 的累加。
 * 环比基准是同一渠道在紧邻的上一等长区间的数据；上一区间为 0 时 changeRate 为 null，
 * 前端显示“—”而不是 NaN / Infinity。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardActivityChannelVO {

    /**
     * 渠道标识：web / miniprogram。
     */
    private String clientType;

    /**
     * 渠道展示名称：Web 网页端 / 微信小程序端。
     */
    private String clientTypeText;

    private Long totalPv;

    private Long totalUv;

    /**
     * 渠道日均 PV，保留 1 位小数。
     */
    private Double averagePv;

    /**
     * 渠道日均 UV（区间去重 UV ÷ 天数），保留 1 位小数。
     */
    private Double averageUv;

    /**
     * 渠道 PV 占全部渠道 PV 的比例（%），保留 1 位小数；总量为 0 时为 null。
     */
    private Double pvShare;

    /**
     * 渠道 UV 占全部渠道 UV 的比例（%），保留 1 位小数；总量为 0 时为 null。
     *
     * <p>说明：UV 是去重访客数，同一访客可能同时出现在 Web 与小程序，
     * 因此各渠道 UV 占比之和可能小于 100%，占比口径以“渠道 UV / 合计 UV”为准。</p>
     */
    private Double uvShare;

    private Long previousTotalPv;

    private Long previousTotalUv;

    /**
     * PV 环比变化百分比，保留 1 位小数；上一区间为 0 时为 null。
     */
    private Double pvChangeRate;

    /**
     * UV 环比变化百分比，保留 1 位小数；上一区间为 0 时为 null。
     */
    private Double uvChangeRate;

    /**
     * 所选区间内该渠道的连续日序列，缺失日期补 0。
     */
    private List<AdminDashboardActivityChannelDailyVO> daily;
}
