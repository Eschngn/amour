package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategorySaveReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoGlobalOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManagePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoSortItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoSortListReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;

import java.util.List;

public interface SpacePhotoManageService {

    Response<List<PhotoCategoryVO>> listCategories();

    Response<Long> saveCategory(PhotoCategorySaveReqVO reqVO);

    Response<Void> deleteCategory(PhotoCategoryIdReqVO reqVO);

    Response<Void> saveCategoryOrder(PhotoCategoryOrderReqVO reqVO);

    Response<PageResult<PhotoManageItemVO>> pagePhotos(PhotoManagePageQueryReqVO reqVO);

    Response<List<PhotoSortItemVO>> listPhotosForSort(PhotoSortListReqVO reqVO);

    Response<SpaceContentSaveResultVO> savePhoto(PhotoSaveReqVO reqVO);

    /** 分类内排序：只更新指定分类的 sort_order，返回该分类最新顺序。 */
    Response<List<PhotoSortItemVO>> savePhotoOrder(PhotoOrderReqVO reqVO);

    /** 全局排序：只更新 global_sort_order，返回全部照片最新顺序。 */
    Response<List<PhotoSortItemVO>> savePhotoGlobalOrder(PhotoGlobalOrderReqVO reqVO);

    Response<Void> deletePhoto(PhotoIdReqVO reqVO);
}
