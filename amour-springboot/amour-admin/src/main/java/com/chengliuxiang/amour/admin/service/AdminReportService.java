package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.report.AdminReportDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportProcessReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminReportService {

    Response<PageResult<AdminReportPageRspVO>> findPage(AdminReportPageReqVO reqVO);

    Response<AdminReportDetailRspVO> findDetail(AdminReportDetailReqVO reqVO);

    Response<Void> process(AdminReportProcessReqVO reqVO);
}
