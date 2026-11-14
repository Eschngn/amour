package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategorySaveReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManagePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;

import java.util.List;

public interface SpacePhotoManageService {

    Response<List<PhotoCategoryVO>> listCategories();

    Response<Long> saveCategory(PhotoCategorySaveReqVO reqVO);

    Response<Void> deleteCategory(PhotoCategoryIdReqVO reqVO);

    Response<PageResult<PhotoManageItemVO>> pagePhotos(PhotoManagePageQueryReqVO reqVO);

    Response<SpaceContentSaveResultVO> savePhoto(PhotoSaveReqVO reqVO);

    Response<Void> deletePhoto(PhotoIdReqVO reqVO);
}
