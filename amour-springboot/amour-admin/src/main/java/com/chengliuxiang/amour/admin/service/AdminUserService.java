package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.user.*;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import java.util.List;

public interface AdminUserService {
    Response<PageResult<UserPageRspVO>> findPage(UserPageReqVO reqVO);
    Response<List<RoleOptionRspVO>> findRoles();
    Response<Void> save(UserSaveReqVO reqVO);
    Response<Void> delete(UserIdReqVO reqVO);
}
