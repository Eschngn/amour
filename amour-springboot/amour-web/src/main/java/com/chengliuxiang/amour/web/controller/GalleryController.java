package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceCardVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailReqVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpaceDetailVO;
import com.chengliuxiang.amour.web.model.vo.gallery.GallerySpacePageQueryReqVO;
import com.chengliuxiang.amour.web.service.GalleryService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;

/**
 * 恋爱广场公开只读接口。
 *
 * <p>这些接口面向未登录访客，不能调用任何依赖登录态的 StpUtil 方法。
 * 空间可见性、状态和内容可见性均由 Service 与 Mapper 的公开查询方法再次校验。</p>
 */
@RestController
@RequestMapping("/gallery")
public class GalleryController {

    @Resource
    private GalleryService galleryService;

    @PostMapping("/spaces")
    @ApiOperationLog(description = "恋爱广场公开空间分页")
    public Response<PageResult<GallerySpaceCardVO>> pagePublicSpaces(
            @Valid @RequestBody GallerySpacePageQueryReqVO reqVO) {
        return galleryService.pagePublicSpaces(reqVO);
    }

    @PostMapping("/space/detail")
    @ApiOperationLog(description = "恋爱广场公开空间详情")
    public Response<GallerySpaceDetailVO> getPublicSpaceDetail(
            @Valid @RequestBody GallerySpaceDetailReqVO reqVO) {
        return galleryService.getPublicSpaceDetail(reqVO);
    }
}
