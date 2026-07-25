package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.config.DeleteSiteConfigReqVO;
import com.chengliuxiang.amour.admin.model.vo.config.FindSiteConfigPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.config.FindSiteConfigPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.config.SaveSiteConfigReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.DeleteDictItemReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.DeleteDictTypeReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictItemListReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictItemListRspVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictTypePageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.FindDictTypePageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.dict.SaveDictItemReqVO;
import com.chengliuxiang.amour.admin.model.vo.dict.SaveDictTypeReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

import java.util.List;

public interface AdminConfigService {

    Response<PageResult<FindSiteConfigPageListRspVO>> findSiteConfigPageList(FindSiteConfigPageListReqVO reqVO);

    Response<Void> saveSiteConfig(SaveSiteConfigReqVO reqVO);

    Response<Void> deleteSiteConfig(DeleteSiteConfigReqVO reqVO);

    Response<PageResult<FindDictTypePageListRspVO>> findDictTypePageList(FindDictTypePageListReqVO reqVO);

    Response<Void> saveDictType(SaveDictTypeReqVO reqVO);

    Response<Void> deleteDictType(DeleteDictTypeReqVO reqVO);

    Response<List<FindDictItemListRspVO>> findDictItemList(FindDictItemListReqVO reqVO);

    Response<Void> saveDictItem(SaveDictItemReqVO reqVO);

    Response<Void> deleteDictItem(DeleteDictItemReqVO reqVO);
}
