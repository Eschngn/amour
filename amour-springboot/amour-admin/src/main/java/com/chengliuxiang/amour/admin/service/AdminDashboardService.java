package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardActivityReqVO;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardActivityVO;
import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardSummaryVO;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminDashboardService {

    Response<AdminDashboardSummaryVO> summary();

    /**
     * 查询页面浏览活跃度趋势。必须拥有工作台查询权限。
     */
    Response<AdminDashboardActivityVO> activity(AdminDashboardActivityReqVO reqVO);
}
