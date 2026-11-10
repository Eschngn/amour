package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.dashboard.AdminDashboardSummaryVO;
import com.chengliuxiang.amour.admin.service.AdminDashboardService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

    @Resource
    private AdminDashboardService adminDashboardService;

    @PostMapping("/summary")
    @ApiOperationLog(description = "查询后台工作台指标")
    public Response<AdminDashboardSummaryVO> summary() {
        return adminDashboardService.summary();
    }
}
