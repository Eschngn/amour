package com.chengliuxiang.amour.admin.controller;


import com.chengliuxiang.amour.admin.model.vo.story.*;
import com.chengliuxiang.amour.admin.service.AdminStoryService;
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
@RequestMapping("/admin/story")
public class AdminStoryController {
    @Resource
    private AdminStoryService adminStoryService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询故事分页数据")
    public Response<PageResult<FindStoryPageListRspVO>> findStoryPageList(@RequestBody FindStoryPageListReqVO reqVO) {
        return adminStoryService.findStoryPageList(reqVO);
    }

    @PostMapping("/detail")
    public Response<FindStoryDetailRspVO> findStoryDetail(@RequestBody @Validated FindStoryDetailReqVO findStoryDetailReqVO) {
        return adminStoryService.findStoryDetail(findStoryDetailReqVO);
    }

    @PostMapping("/updatePublishStatus")
    @ApiOperationLog(description = "更新故事可见性")
    public Response<Void> updatePublishStatus(@RequestBody @Validated UpdateStoryVisibleStatusReqVO reqVO) {
        return adminStoryService.updatePublishStatus(reqVO);
    }

    @PostMapping("/delete")
    @ApiOperationLog(description = "删除故事")
    public Response<Void> deleteStory(@RequestBody @Validated DeleteStoryReqVO reqVO) {
        return adminStoryService.deleteStory(reqVO);
    }
}
