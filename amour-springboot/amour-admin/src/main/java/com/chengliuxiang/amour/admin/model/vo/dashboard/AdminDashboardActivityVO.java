package com.chengliuxiang.amour.admin.model.vo.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 工作台活跃度趋势。
 *
 * <p>PV 为有效页面浏览次数；UV 为所选区间内按访客键去重的访客数。
 * 环比基准为紧邻当前区间之前的等长区间；上一区间为 0 时 changeRate 为 null，
 * 前端显示“—”而不是 NaN/Infinity。</p>
 *
 * <p>总量字段（totalPv/totalUv/daily）保持原有含义：全部渠道合计。
 * {@code channels} 为按渠道拆分的明细，顺序固定为 Web、微信小程序，
 * 某个渠道没有数据时仍然返回且数值为 0。
 * 合计 UV 与各渠道 UV 均按整段区间独立去重，任一层级都不能由每日 UV 相加得到。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardActivityVO {

    private String startDate;

    private String endDate;

    /**
     * 区间天数（含首尾）。
     */
    private Integer days;

    private Long totalPv;

    private Long totalUv;

    /**
     * 日均 PV，保留 1 位小数。
     */
    private Double averagePv;

    /**
     * 日均 UV，保留 1 位小数。
     */
    private Double averageUv;

    private String previousStartDate;

    private String previousEndDate;

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
     * 连续日序列（全部渠道合计 + 分渠道字段），无事件的日期补 0。
     */
    private List<AdminDashboardActivityDailyVO> daily;

    /**
     * 分渠道明细，顺序固定为 web、miniprogram，始终返回两个渠道。
     */
    private List<AdminDashboardActivityChannelVO> channels;

    private String generatedAt;

    private String timezone;

    /**
     * 统计覆盖范围：web+miniprogram。
     */
    private String coverage;

    /**
     * 渠道统计口径说明：渠道来自客户端类型标识，仅用于统计，不作为权限判断依据。
     */
    private String channelNote;

    /**
     * 历史数据兼容说明：缺省渠道字段的旧记录按 Web 归类。
     */
    private String historyNote;

    private Integer maxRangeDays;

    private Integer retentionDays;
}
