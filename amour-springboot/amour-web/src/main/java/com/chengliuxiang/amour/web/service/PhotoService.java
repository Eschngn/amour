package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageQueryReqVO;

import java.util.List;

public interface PhotoService {

    /**
     * 分页查询前台可见的照片。
     */
    Response<PageResult<PhotoPageItemVO>> pagePhotos(PhotoPageQueryReqVO reqVO);

    /**
     * 查询前台首页使用的相册封面。
     */
    Response<PhotoPageItemVO> findCoverPhoto();

    /**
     * 查询前台启用的相册分类。
     */
    Response<List<PhotoCategoryVO>> listCategories();
}
