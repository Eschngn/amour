package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.user.*;
import com.chengliuxiang.amour.admin.service.AdminUserService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/admin/user")
@Validated
public class AdminUserController {
    @Resource private AdminUserService adminUserService;
    @PostMapping("/list") @ApiOperationLog(description = "查询用户分页数据") public Response<PageResult<UserPageRspVO>> list(@RequestBody UserPageReqVO reqVO) { return adminUserService.findPage(reqVO); }
    @PostMapping("/roles") @ApiOperationLog(description = "查询可用角色") public Response<List<RoleOptionRspVO>> roles() { return adminUserService.findRoles(); }
    @PostMapping("/save") @ApiOperationLog(description = "保存用户") public Response<Void> save(@Validated @RequestBody UserSaveReqVO reqVO) { return adminUserService.save(reqVO); }
    @PostMapping("/delete") @ApiOperationLog(description = "停用用户") public Response<Void> delete(@Validated @RequestBody UserIdReqVO reqVO) { return adminUserService.delete(reqVO); }
}
