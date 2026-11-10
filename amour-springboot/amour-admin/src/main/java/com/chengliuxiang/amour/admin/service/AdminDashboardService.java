package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardSummaryVO;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminDashboardService {

    Response<AdminDashboardSummaryVO> summary();
}
