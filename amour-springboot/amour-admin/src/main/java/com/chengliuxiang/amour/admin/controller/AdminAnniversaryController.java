package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.anniversary.DeleteAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.UpdateAnniversaryVisibleStatusReqVO;
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
    @ApiOperationLog(description = "查询后台纪念日治理分页数据")
    public Response<PageResult<FindAnniversaryPageListRspVO>> findAnniversaryPageList(
            @RequestBody FindAnniversaryPageListReqVO reqVO) {
        return adminAnniversaryService.findAnniversaryPageList(reqVO);
    }

    @PostMapping("/detail")
    public Response<FindAnniversaryDetailRspVO> findAnniversaryDetail(
            @Validated @RequestBody FindAnniversaryDetailReqVO reqVO) {
        return adminAnniversaryService.findAnniversaryDetail(reqVO);
    }

    @PostMapping("/updateVisibleStatus")
    @ApiOperationLog(description = "更新纪念日可见性")
    public Response<Void> updateVisibleStatus(
            @Validated @RequestBody UpdateAnniversaryVisibleStatusReqVO reqVO) {
        return adminAnniversaryService.updateVisibleStatus(reqVO);
    }

    @PostMapping("/delete")
    @ApiOperationLog(description = "逻辑删除纪念日")
    public Response<Void> deleteAnniversary(@Validated @RequestBody DeleteAnniversaryReqVO reqVO) {
        return adminAnniversaryService.deleteAnniversary(reqVO);
    }
}
