package com.chengliuxiang.amour.admin.model.vo.dashboard;

import lombok.Data;

/**
 * 工作台活跃度查询参数。日期为空时使用默认近 7 天。
 */
@Data
public class AdminDashboardActivityReqVO {

    /**
     * 开始日期 yyyy-MM-dd（含）。
     */
    private String startDate;

    /**
     * 结束日期 yyyy-MM-dd（含），不能晚于服务端今天。
     */
    private String endDate;
}
