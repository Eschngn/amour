package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpacePageRspVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreReqVO;
import com.chengliuxiang.amour.admin.model.vo.space.AdminSpaceRestoreRspVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

/**
 * 后台情侣空间管理。
 */
public interface AdminSpaceService {

    /**
     * 分页查询情侣空间，支持空间名/编码/成员恋语 ID、状态与公开状态筛选。
     */
    Response<PageResult<AdminSpacePageRspVO>> findSpacePage(AdminSpacePageReqVO reqVO);

    /**
     * 查询空间详情：资料、成员、邀请、生命周期、内容索引与恢复资格。
     */
    Response<AdminSpaceDetailRspVO> findSpaceDetail(AdminSpaceDetailReqVO reqVO);

    /**
     * 人工恢复双方已解绑（status=5）的情侣空间，必须填写原因并写审计。
     *
     * <p>恢复时会把两名历史成员恢复为有效；若成员在解绑后创建了「等待绑定且仅自己一人」的
     * 冲突空间，会在同一事务内安全关闭；若冲突空间已有其他有效成员或处于其他状态，
     * 整笔恢复被拒绝且不做任何部分更新。</p>
     */
    Response<AdminSpaceRestoreRspVO> restoreSpace(AdminSpaceRestoreReqVO reqVO);
}
