package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoVisibleStatusReqVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

import java.util.List;

/**
 * 兼容旧路径的照片治理接口：只保留查询、隐藏/恢复展示、逻辑删除和分类只读。
 */
public interface AdminPhotoService {

    Response<PageResult<FindPhotoPageListRspVO>> findPhotoPageList(FindPhotoPageListReqVO reqVO);

    Response<Void> updateVisibleStatus(UpdatePhotoVisibleStatusReqVO reqVO);

    Response<Void> deletePhoto(DeletePhotoReqVO reqVO);

    Response<List<PhotoCategoryListRspVO>> listPhotoCategories(PhotoCategoryListReqVO reqVO);
}
