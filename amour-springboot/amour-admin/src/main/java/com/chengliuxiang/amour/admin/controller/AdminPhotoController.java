package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoVisibleStatusReqVO;
import com.chengliuxiang.amour.admin.service.AdminPhotoService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/admin/photo")
@Validated
public class AdminPhotoController {

    @Resource
    private AdminPhotoService adminPhotoService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询后台照片治理分页数据")
    public Response<PageResult<FindPhotoPageListRspVO>> findPhotoPageList(
            @Validated @RequestBody FindPhotoPageListReqVO reqVO) {
        return adminPhotoService.findPhotoPageList(reqVO);
    }

    @PostMapping("/updateVisibleStatus")
    @ApiOperationLog(description = "更新照片可见性")
    public Response<Void> updateVisibleStatus(@Validated @RequestBody UpdatePhotoVisibleStatusReqVO reqVO) {
        return adminPhotoService.updateVisibleStatus(reqVO);
    }

    @PostMapping("/delete")
    @ApiOperationLog(description = "逻辑删除照片")
    public Response<Void> deletePhoto(@Validated @RequestBody DeletePhotoReqVO reqVO) {
        return adminPhotoService.deletePhoto(reqVO);
    }

    @PostMapping("/category/list")
    @ApiOperationLog(description = "查询照片分类列表")
    public Response<List<PhotoCategoryListRspVO>> listPhotoCategories(
            @RequestBody(required = false) PhotoCategoryListReqVO reqVO) {
        return adminPhotoService.listPhotoCategories(reqVO);
    }
}
