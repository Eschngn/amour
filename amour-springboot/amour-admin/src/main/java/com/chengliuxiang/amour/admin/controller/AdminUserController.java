package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.user.UserIdReqVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserSaveReqVO;
import com.chengliuxiang.amour.admin.service.AdminUserService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

@RestController
@RequestMapping("/admin/user")
@Validated
public class AdminUserController {
    @Resource private AdminUserService adminUserService;
    @PostMapping("/list") @ApiOperationLog(description = "查询用户分页数据") public Response<PageResult<UserPageRspVO>> list(@RequestBody UserPageReqVO reqVO) { return adminUserService.findPage(reqVO); }
    @PostMapping("/save") @ApiOperationLog(description = "保存用户") public Response<Void> save(@Validated @RequestBody UserSaveReqVO reqVO) { return adminUserService.save(reqVO); }
    @PostMapping("/delete") @ApiOperationLog(description = "停用用户") public Response<Void> delete(@Validated @RequestBody UserIdReqVO reqVO) { return adminUserService.delete(reqVO); }
}
