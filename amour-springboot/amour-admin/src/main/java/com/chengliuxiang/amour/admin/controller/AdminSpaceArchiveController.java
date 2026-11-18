package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchivePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchivePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveRestoreReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveRestoreRspVO;
import com.chengliuxiang.amour.admin.service.AdminSpaceArchiveService;
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
 * 后台「已销毁情侣空间」留档查询与恢复。
 *
 * <p>访问权限由 {@code AdminTokenFilter} 认证平台管理员，
 * 细粒度授权由 {@code AdminPermissionInterceptor} 与 Service 层共同校验：
 * 查询需要 {@code admin:space:query}，恢复需要 {@code admin:space:restore}。</p>
 */
@RestController
@RequestMapping("/admin/space/archive")
@Validated
public class AdminSpaceArchiveController {

    @Resource
    private AdminSpaceArchiveService adminSpaceArchiveService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询情侣空间销毁留档分页数据（后台）")
    public Response<PageResult<AdminSpaceArchivePageRspVO>> list(
            @RequestBody AdminSpaceArchivePageReqVO reqVO) {
        return adminSpaceArchiveService.findArchivePage(reqVO);
    }

    @PostMapping("/detail")
    @ApiOperationLog(description = "查询情侣空间销毁留档详情（后台）")
    public Response<AdminSpaceArchiveDetailRspVO> detail(
            @Validated @RequestBody AdminSpaceArchiveDetailReqVO reqVO) {
        return adminSpaceArchiveService.findArchiveDetail(reqVO);
    }

    @PostMapping("/restore")
    @ApiOperationLog(description = "从销毁留档恢复情侣空间（后台）")
    public Response<AdminSpaceArchiveRestoreRspVO> restore(
            @Validated @RequestBody AdminSpaceArchiveRestoreReqVO reqVO) {
        return adminSpaceArchiveService.restoreFromArchive(reqVO);
    }
}
