package com.chengliuxiang.amour.admin.model.vo.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 活跃度趋势中的一天。
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

    private Long pv;

    private Long uv;
}
