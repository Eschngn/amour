package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchivePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchivePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveRestoreReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceArchiveRestoreRspVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

/**
 * 后台「已销毁情侣空间留档」查询与恢复。
 *
 * <p>只有平台管理员可调用：认证由 {@code AdminTokenFilter} 完成，细粒度授权由
 * Service 层再次校验（查询用 SPACE_QUERY，恢复用 SPACE_RESTORE），
 * 不能复用普通用户接口绕过权限。</p>
 */
public interface AdminSpaceArchiveService {

    /**
     * 分页查询已销毁空间留档，默认只看尚未恢复的留档。
     */
    Response<PageResult<AdminSpaceArchivePageRspVO>> findArchivePage(AdminSpaceArchivePageReqVO reqVO);

    /**
     * 查询单条留档详情：完整性、恢复资格与冲突情况。
     */
    Response<AdminSpaceArchiveDetailRspVO> findArchiveDetail(AdminSpaceArchiveDetailReqVO reqVO);

    /**
     * 从留档恢复空间。必须填写原因并写入审计；
     * 恢复前重新校验权限、留档状态、空间状态与成员/资源冲突，冲突时明确报错且不覆盖现存数据。
     */
    Response<AdminSpaceArchiveRestoreRspVO> restoreFromArchive(AdminSpaceArchiveRestoreReqVO reqVO);
}
