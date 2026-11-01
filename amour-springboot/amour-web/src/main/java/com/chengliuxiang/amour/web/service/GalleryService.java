package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceCardVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpacePageQueryReqVO;

/**
 * 恋爱广场公开只读接口。
 * 所有方法都不依赖登录用户，匿名访问也只能读取公开数据。
 */
public interface GalleryService {

    /**
     * 分页查询公开到恋爱广场且状态正常的空间。
     */
    Response<PageResult<GallerySpaceCardVO>> pagePublicSpaces(GallerySpacePageQueryReqVO reqVO);

    /**
     * 查询公开空间详情，只返回 visibility=1 的故事、照片和纪念日。
     */
    Response<GallerySpaceDetailVO> getPublicSpaceDetail(GallerySpaceDetailReqVO reqVO);
}
