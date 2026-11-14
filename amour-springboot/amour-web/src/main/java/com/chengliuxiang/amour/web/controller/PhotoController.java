package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategorySaveReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoCategoryVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoIdReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoManagePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageItemVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoPageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.photo.PhotoSaveReqVO;
import com.chengliuxiang.amour.web.service.PhotoService;
import com.chengliuxiang.amour.web.service.SpacePhotoManageService;
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

    @Resource
    private SpacePhotoManageService spacePhotoManageService;

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

    /* ==================== 用户端空间相册管理（等待绑定期间也可使用） ==================== */

    @PostMapping("/manage/categories")
    @ApiOperationLog(description = "空间相册分类管理列表")
    public Response<List<PhotoCategoryVO>> listManageCategories() {
        return spacePhotoManageService.listCategories();
    }

    @PostMapping("/manage/category/save")
    @ApiOperationLog(description = "新增或编辑空间相册分类")
    public Response<Long> saveCategory(@Valid @RequestBody PhotoCategorySaveReqVO reqVO) {
        return spacePhotoManageService.saveCategory(reqVO);
    }

    @PostMapping("/manage/category/delete")
    @ApiOperationLog(description = "删除空间相册分类")
    public Response<Void> deleteCategory(@Valid @RequestBody PhotoCategoryIdReqVO reqVO) {
        return spacePhotoManageService.deleteCategory(reqVO);
    }

    @PostMapping("/manage/page")
    @ApiOperationLog(description = "空间相册照片管理分页")
    public Response<PageResult<PhotoManageItemVO>> pageManagePhotos(
            @Valid @RequestBody PhotoManagePageQueryReqVO reqVO) {
        return spacePhotoManageService.pagePhotos(reqVO);
    }

    @PostMapping("/manage/photo/save")
    @ApiOperationLog(description = "新增或编辑空间相册照片")
    public Response<SpaceContentSaveResultVO> savePhoto(@Valid @RequestBody PhotoSaveReqVO reqVO) {
        return spacePhotoManageService.savePhoto(reqVO);
    }

    @PostMapping("/manage/photo/delete")
    @ApiOperationLog(description = "删除空间相册照片")
    public Response<Void> deletePhoto(@Valid @RequestBody PhotoIdReqVO reqVO) {
        return spacePhotoManageService.deletePhoto(reqVO);
    }
}
