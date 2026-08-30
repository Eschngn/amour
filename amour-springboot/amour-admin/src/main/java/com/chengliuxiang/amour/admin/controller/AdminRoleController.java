package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.role.*;
import com.chengliuxiang.amour.admin.service.AdminRoleService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/admin/role")
@Validated
public class AdminRoleController {
    @Resource private AdminRoleService adminRoleService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询角色分页数据")
    public Response<PageResult<RolePageRspVO>> list(@RequestBody RolePageReqVO reqVO) { return adminRoleService.findPage(reqVO); }

    @PostMapping("/detail")
    @ApiOperationLog(description = "查询角色详情")
    public Response<RolePageRspVO> detail(@Validated @RequestBody RoleIdReqVO reqVO) { return adminRoleService.findDetail(reqVO); }

    @PostMapping("/permissions")
    @ApiOperationLog(description = "查询权限树")
    public Response<List<PermissionRspVO>> permissions() { return adminRoleService.findPermissions(); }

    @PostMapping("/save")
    @ApiOperationLog(description = "保存角色")
    public Response<Void> save(@Validated @RequestBody RoleSaveReqVO reqVO) { return adminRoleService.save(reqVO); }

    @PostMapping("/delete")
    @ApiOperationLog(description = "删除角色")
    public Response<Void> delete(@Validated @RequestBody RoleIdReqVO reqVO) { return adminRoleService.delete(reqVO); }
}
