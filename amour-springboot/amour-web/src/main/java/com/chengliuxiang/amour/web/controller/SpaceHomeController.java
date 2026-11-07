package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceHomeVO;
import com.chengliuxiang.amour.web.service.SpaceHomeService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;

@RestController
@RequestMapping("/space")
public class SpaceHomeController {

    @Resource
    private SpaceHomeService spaceHomeService;

    @PostMapping("/home/query")
    @ApiOperationLog(description = "查询当前空间首页数据")
    public Response<SpaceHomeVO> queryHome() {
        return spaceHomeService.queryHome();
    }

    @PostMapping("/home/save")
    @ApiOperationLog(description = "保存当前空间首页数据")
    public Response<SpaceHomeVO> saveHome(@Valid @RequestBody SpaceHomeSaveReqVO reqVO) {
        return spaceHomeService.saveHome(reqVO);
    }
}
