package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.gallery.GalleryPublicStoryDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceCardVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpacePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GalleryStoryDetailVO;

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
     * 查询公开空间详情，只返回公开故事摘要、照片和纪念日。
     * 故事列表不包含完整正文，正文需通过 {@link #getPublicStoryDetail} 按需读取。
     */
    Response<GallerySpaceDetailVO> getPublicSpaceDetail(GallerySpaceDetailReqVO reqVO);

    /**
     * 查询单篇公开故事正文。
     * 只在 spaceId 对应的公开空间快照内查找 storyId，不直接读取当前故事表。
     */
    Response<GalleryStoryDetailVO> getPublicStoryDetail(GalleryPublicStoryDetailReqVO reqVO);
}
