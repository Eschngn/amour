package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.anniversary.AddAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.DeleteAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.UpdateAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.UpdateAnniversaryVisibleStatusReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminAnniversaryService {
    Response<PageResult<FindAnniversaryPageListRspVO>> findAnniversaryPageList(FindAnniversaryPageListReqVO reqVO);
    Response<FindAnniversaryDetailRspVO> findAnniversaryDetail(FindAnniversaryDetailReqVO reqVO);
    Response<Long> addAnniversary(AddAnniversaryReqVO reqVO);
    Response<Void> updateAnniversary(UpdateAnniversaryReqVO reqVO);
    Response<Void> updateVisibleStatus(UpdateAnniversaryVisibleStatusReqVO reqVO);
    Response<Void> deleteAnniversary(DeleteAnniversaryReqVO reqVO);
}
