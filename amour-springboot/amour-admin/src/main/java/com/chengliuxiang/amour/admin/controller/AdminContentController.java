package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDeleteReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentModerateReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageRspVO;
import com.chengliuxiang.amour.admin.service.AdminContentGovernanceService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

/**
 * 后台内容治理统一入口：查看、隐藏/恢复展示、逻辑删除。
 * 不提供代用户编辑或新增正文的接口。
 */
@RestController
@RequestMapping("/admin/content")
@Validated
public class AdminContentController {

    @Resource
    private AdminContentGovernanceService adminContentGovernanceService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询内容治理分页数据")
    public Response<PageResult<AdminContentPageRspVO>> list(@RequestBody AdminContentPageReqVO reqVO) {
        return adminContentGovernanceService.findPage(reqVO);
    }

    @PostMapping("/detail")
    public Response<AdminContentDetailRspVO> detail(@Validated @RequestBody AdminContentDetailReqVO reqVO) {
        return adminContentGovernanceService.findDetail(reqVO);
    }

    @PostMapping("/moderate")
    @ApiOperationLog(description = "隐藏或恢复内容展示")
    public Response<Void> moderate(@Validated @RequestBody AdminContentModerateReqVO reqVO) {
        return adminContentGovernanceService.moderateVisibility(reqVO);
    }

    @PostMapping("/delete")
    @ApiOperationLog(description = "逻辑删除内容")
    public Response<Void> delete(@Validated @RequestBody AdminContentDeleteReqVO reqVO) {
        return adminContentGovernanceService.deleteContent(reqVO);
    }
}
