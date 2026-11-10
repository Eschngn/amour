package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.report.AdminReportDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportProcessReqVO;
import com.chengliuxiang.amour.admin.service.AdminReportService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

/**
 * 后台举报审核队列与处理。
 */
@RestController
@RequestMapping("/admin/report")
@Validated
public class AdminReportController {

    @Resource
    private AdminReportService adminReportService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询举报分页数据")
    public Response<PageResult<AdminReportPageRspVO>> list(@RequestBody AdminReportPageReqVO reqVO) {
        return adminReportService.findPage(reqVO);
    }

    @PostMapping("/detail")
    public Response<AdminReportDetailRspVO> detail(@Validated @RequestBody AdminReportDetailReqVO reqVO) {
        return adminReportService.findDetail(reqVO);
    }

    @PostMapping("/process")
    @ApiOperationLog(description = "处理举报")
    public Response<Void> process(@Validated @RequestBody AdminReportProcessReqVO reqVO) {
        return adminReportService.process(reqVO);
    }
}
