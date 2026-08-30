package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.role.*;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import java.util.List;

public interface AdminRoleService {
    Response<PageResult<RolePageRspVO>> findPage(RolePageReqVO reqVO);
    Response<RolePageRspVO> findDetail(RoleIdReqVO reqVO);
    Response<List<PermissionRspVO>> findPermissions();
    Response<Void> save(RoleSaveReqVO reqVO);
    Response<Void> delete(RoleIdReqVO reqVO);
}
