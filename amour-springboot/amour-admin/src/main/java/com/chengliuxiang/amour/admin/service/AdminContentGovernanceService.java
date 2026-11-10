package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDeleteReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentModerateReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageRspVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

/**
 * 后台内容治理：按空间查看、隐藏/恢复展示、逻辑删除。
 *
 * <p>不提供代用户新增/编辑正文；所有写操作都要求显式空间、原因和审计。</p>
 */
public interface AdminContentGovernanceService {

    Response<PageResult<AdminContentPageRspVO>> findPage(AdminContentPageReqVO reqVO);

    Response<AdminContentDetailRspVO> findDetail(AdminContentDetailReqVO reqVO);

    Response<Void> moderateVisibility(AdminContentModerateReqVO reqVO);

    Response<Void> deleteContent(AdminContentDeleteReqVO reqVO);
}
