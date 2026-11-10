package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListReqVO;
import com.chengliuxiang.amour.admin.model.vo.chapter.FindChapterListRspVO;
import com.chengliuxiang.amour.admin.service.AdminChapterService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/admin/chapter")
public class AdminChapterController {
    @Resource
    private AdminChapterService adminChapterService;

    @PostMapping("/findChapterList")
    @ApiOperationLog(description = "按空间获取故事章节")
    public Response<List<FindChapterListRspVO>> findChapterList(
            @RequestBody(required = false) FindChapterListReqVO reqVO) {
        return adminChapterService.findChapterList(reqVO);
    }
}
