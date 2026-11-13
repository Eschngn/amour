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
     * 连续日序列，无事件的日期补 0。
     */
    private List<AdminDashboardActivityDailyVO> daily;

    private String generatedAt;

    private String timezone;

    /**
     * 统计覆盖范围，当前固定为 web-spa。
     */
    private String coverage;

    private Integer maxRangeDays;

    private Integer retentionDays;
}
