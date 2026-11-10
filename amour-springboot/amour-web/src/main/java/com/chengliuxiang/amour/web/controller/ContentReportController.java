package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.report.ContentReportSubmitReqVO;
import com.chengliuxiang.amour.web.service.ContentReportService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;

/**
 * 用户端内容举报入口。只能举报公开空间或公开内容。
 */
@RestController
@RequestMapping("/report")
public class ContentReportController {

    @Resource
    private ContentReportService contentReportService;

    @PostMapping("/submit")
    @ApiOperationLog(description = "提交内容举报")
    public Response<Long> submit(@Valid @RequestBody ContentReportSubmitReqVO reqVO) {
        return contentReportService.submit(reqVO);
    }
}
