package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.report.ContentReportSubmitReqVO;

public interface ContentReportService {

    /**
     * 提交公开空间/公开内容举报。
     */
    Response<Long> submit(ContentReportSubmitReqVO reqVO);
}
