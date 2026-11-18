package com.chengliuxiang.amour.admin.model.vo.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 单个渠道某一天的数据。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardActivityChannelDailyVO {

    /**
     * 日期 yyyy-MM-dd（Asia/Shanghai）。
     */
    private String date;

    private Long pv;

    private Long uv;
}
