package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

/**
 * 后台情侣空间管理。
 */
public interface AdminSpaceService {

    /**
     * 分页查询情侣空间，默认页面会筛选 status=5（双方已解绑）。
     */
    Response<PageResult<AdminSpacePageRspVO>> findSpacePage(AdminSpacePageReqVO reqVO);

    /**
     * 人工恢复双方已解绑（status=5）的情侣空间。
     */
    Response<Void> restoreSpace(AdminSpaceRestoreReqVO reqVO);
}
