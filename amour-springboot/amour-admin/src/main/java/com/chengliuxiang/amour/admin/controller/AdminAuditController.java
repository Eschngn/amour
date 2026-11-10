package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.audit.AdminAuditPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.audit.AdminAuditPageRspVO;
import com.chengliuxiang.amour.admin.service.AdminAuditService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/admin/audit")
public class AdminAuditController {

    @Resource
    private AdminAuditService adminAuditService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询后台操作审计")
    public Response<PageResult<AdminAuditPageRspVO>> list(@RequestBody AdminAuditPageReqVO reqVO) {
        return adminAuditService.findPage(reqVO);
    }
}
