package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryIdReqVO;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversarySaveReqVO;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryVO;
import com.chengliuxiang.amour.web.service.AnniversaryService;
import com.chengliuxiang.amour.web.service.SpaceAnniversaryManageService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/anniversary")
public class AnniversaryController {

    @Resource
    private AnniversaryService anniversaryService;

    @Resource
    private SpaceAnniversaryManageService spaceAnniversaryManageService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询前台纪念日列表")
    public Response<List<AnniversaryVO>> listAnniversaries() {
        return anniversaryService.listAnniversaries();
    }

    /* ==================== 用户端空间纪念日管理（等待绑定期间也可使用） ==================== */

    @PostMapping("/manage/list")
    @ApiOperationLog(description = "空间纪念日管理列表")
    public Response<List<AnniversaryVO>> listManageAnniversaries() {
        return spaceAnniversaryManageService.listAnniversaries();
    }

    @PostMapping("/manage/save")
    @ApiOperationLog(description = "新增或编辑空间纪念日")
    public Response<Long> saveAnniversary(@Valid @RequestBody AnniversarySaveReqVO reqVO) {
        return spaceAnniversaryManageService.saveAnniversary(reqVO);
    }

    @PostMapping("/manage/delete")
    @ApiOperationLog(description = "删除空间纪念日")
    public Response<Void> deleteAnniversary(@Valid @RequestBody AnniversaryIdReqVO reqVO) {
        return spaceAnniversaryManageService.deleteAnniversary(reqVO);
    }
}
