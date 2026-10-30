package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageQueryReqVO;
import com.chengliuxiang.amour.web.service.PhotoService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/photo")
public class PhotoController {

    @Resource
    private PhotoService photoService;

    @PostMapping("/page")
    @ApiOperationLog(description = "前台分页查询相册照片")
    public Response<PageResult<PhotoPageItemVO>> pagePhotos(
            @Valid @RequestBody PhotoPageQueryReqVO reqVO) {
        return photoService.pagePhotos(reqVO);
    }

    @PostMapping("/cover")
    @ApiOperationLog(description = "查询前台相册封面")
    public Response<PhotoPageItemVO> findCoverPhoto() {
        return photoService.findCoverPhoto();
    }

    @PostMapping("/categories")
    @ApiOperationLog(description = "查询前台相册分类")
    public Response<List<PhotoCategoryVO>> listCategories() {
        return photoService.listCategories();
    }
}
