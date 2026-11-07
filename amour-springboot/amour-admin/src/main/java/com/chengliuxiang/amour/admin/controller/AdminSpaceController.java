package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreReqVO;
import com.chengliuxiang.amour.admin.service.AdminSpaceService;
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
 * 后台「双方已解绑情侣空间」查询与人工恢复。
 *
 * <p>访问权限统一由 {@code AdminTokenFilter} 校验平台管理员身份，不新增另一套认证逻辑。</p>
 */
@RestController
@RequestMapping("/admin/space")
@Validated
public class AdminSpaceController {

    @Resource
    private AdminSpaceService adminSpaceService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询情侣空间分页数据（后台）")
    public Response<PageResult<AdminSpacePageRspVO>> list(@RequestBody AdminSpacePageReqVO reqVO) {
        return adminSpaceService.findSpacePage(reqVO);
    }

    @PostMapping("/restore")
    @ApiOperationLog(description = "人工恢复双方已解绑的情侣空间")
    public Response<Void> restore(@RequestBody @Validated AdminSpaceRestoreReqVO reqVO) {
        return adminSpaceService.restoreSpace(reqVO);
    }
}
