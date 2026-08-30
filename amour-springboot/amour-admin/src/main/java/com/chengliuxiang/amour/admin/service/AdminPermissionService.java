package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.permission.PermissionIdReqVO;
import com.chengliuxiang.amour.admin.model.vo.permission.PermissionPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.permission.PermissionSaveReqVO;
import com.chengliuxiang.amour.common.utils.Response;

import java.util.List;

public interface AdminPermissionService {
    Response<List<PermissionPageRspVO>> findTree();
    Response<Void> save(PermissionSaveReqVO reqVO);
    Response<Void> delete(PermissionIdReqVO reqVO);
}
