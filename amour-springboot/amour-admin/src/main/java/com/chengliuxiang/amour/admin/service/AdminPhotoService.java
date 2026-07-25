package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.photo.AddPhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoCategoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.SavePhotoCategoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoVisibleStatusReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

import java.util.List;

public interface AdminPhotoService {

    Response<PageResult<FindPhotoPageListRspVO>> findPhotoPageList(FindPhotoPageListReqVO reqVO);

    Response<Long> addPhoto(AddPhotoReqVO reqVO);

    Response<Void> updatePhoto(UpdatePhotoReqVO reqVO);

    Response<Void> updateVisibleStatus(UpdatePhotoVisibleStatusReqVO reqVO);

    Response<Void> deletePhoto(DeletePhotoReqVO reqVO);

    Response<List<PhotoCategoryListRspVO>> listPhotoCategories();

    Response<Long> savePhotoCategory(SavePhotoCategoryReqVO reqVO);

    Response<Void> deletePhotoCategory(DeletePhotoCategoryReqVO reqVO);
}
