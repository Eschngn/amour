package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryVO;
import com.chengliuxiang.amour.web.service.AnniversaryService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/anniversary")
public class AnniversaryController {

    @Resource
    private AnniversaryService anniversaryService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询前台纪念日列表")
    public Response<List<AnniversaryVO>> listAnniversaries() {
        return anniversaryService.listAnniversaries();
    }
}
