package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.permission.PermissionIdReqVO;
import com.chengliuxiang.amour.admin.model.vo.permission.PermissionPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.permission.PermissionSaveReqVO;
import com.chengliuxiang.amour.admin.service.AdminPermissionService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/admin/permission")
@Validated
public class AdminPermissionController {
    @Resource private AdminPermissionService adminPermissionService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询权限树")
    public Response<List<PermissionPageRspVO>> list() { return adminPermissionService.findTree(); }

    @PostMapping("/save")
    @ApiOperationLog(description = "保存权限")
    public Response<Void> save(@Validated @RequestBody PermissionSaveReqVO reqVO) { return adminPermissionService.save(reqVO); }

    @PostMapping("/delete")
    @ApiOperationLog(description = "删除权限")
    public Response<Void> delete(@Validated @RequestBody PermissionIdReqVO reqVO) { return adminPermissionService.delete(reqVO); }
}
