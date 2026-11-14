package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryIdReqVO;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversarySaveReqVO;
import com.chengliuxiang.amour.web.model.vo.anniversary.AnniversaryVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;

import java.util.List;

public interface SpaceAnniversaryManageService {

    Response<List<AnniversaryVO>> listAnniversaries();

    Response<SpaceContentSaveResultVO> saveAnniversary(AnniversarySaveReqVO reqVO);

    Response<Void> deleteAnniversary(AnniversaryIdReqVO reqVO);
}
