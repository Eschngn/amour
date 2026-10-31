package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.user.UserIdReqVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.user.UserSaveReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminUserService {
    Response<PageResult<UserPageRspVO>> findPage(UserPageReqVO reqVO);
    Response<Void> save(UserSaveReqVO reqVO);
    Response<Void> delete(UserIdReqVO reqVO);
}
