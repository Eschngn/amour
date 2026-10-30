package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.anniversary.*;
import com.chengliuxiang.amour.admin.service.AdminAnniversaryService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/admin/anniversary")
@Validated
public class AdminAnniversaryController {

    @Resource
    private AdminAnniversaryService adminAnniversaryService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询后台纪念日分页数据")
    public Response<PageResult<FindAnniversaryPageListRspVO>> findAnniversaryPageList(@RequestBody FindAnniversaryPageListReqVO reqVO) {
        return adminAnniversaryService.findAnniversaryPageList(reqVO);
    }

    @PostMapping("/detail")
    @ApiOperationLog(description = "查询纪念日详情")
    public Response<FindAnniversaryDetailRspVO> findAnniversaryDetail(@Validated @RequestBody FindAnniversaryDetailReqVO reqVO) {
        return adminAnniversaryService.findAnniversaryDetail(reqVO);
    }

    @PostMapping("/add")
    @ApiOperationLog(description = "新增纪念日")
    public Response<Long> addAnniversary(@Validated @RequestBody AddAnniversaryReqVO reqVO) {
        return adminAnniversaryService.addAnniversary(reqVO);
    }

    @PostMapping("/update")
    @ApiOperationLog(description = "更新纪念日")
    public Response<Void> updateAnniversary(@Validated @RequestBody UpdateAnniversaryReqVO reqVO) {
        return adminAnniversaryService.updateAnniversary(reqVO);
    }

    @PostMapping("/updateVisibleStatus")
    @ApiOperationLog(description = "更新纪念日显示状态")
    public Response<Void> updateVisibleStatus(@Validated @RequestBody UpdateAnniversaryVisibleStatusReqVO reqVO) {
        return adminAnniversaryService.updateVisibleStatus(reqVO);
    }

    @PostMapping("/delete")
    @ApiOperationLog(description = "删除纪念日")
    public Response<Void> deleteAnniversary(@Validated @RequestBody DeleteAnniversaryReqVO reqVO) {
        return adminAnniversaryService.deleteAnniversary(reqVO);
    }
}
