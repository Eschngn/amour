package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.photo.AddPhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoCategoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.DeletePhotoReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.FindPhotoPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.PhotoCategoryListRspVO;
import com.chengliuxiang.amour.admin.model.vo.photo.SavePhotoCategoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.photo.UpdatePhotoReqVO;
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
import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/admin/photo")
@Validated
public class AdminPhotoController {

    @Resource
    private AdminPhotoService adminPhotoService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询后台照片分页数据")
    public Response<PageResult<FindPhotoPageListRspVO>> findPhotoPageList(
            @Valid @RequestBody FindPhotoPageListReqVO reqVO) {
        return adminPhotoService.findPhotoPageList(reqVO);
    }

    @PostMapping("/add")
    @ApiOperationLog(description = "新增照片")
    public Response<Long> addPhoto(@Valid @RequestBody AddPhotoReqVO reqVO) {
        return adminPhotoService.addPhoto(reqVO);
    }

    @PostMapping("/update")
    @ApiOperationLog(description = "更新照片")
    public Response<Void> updatePhoto(@Valid @RequestBody UpdatePhotoReqVO reqVO) {
        return adminPhotoService.updatePhoto(reqVO);
    }

    @PostMapping("/updateVisibleStatus")
    @ApiOperationLog(description = "更新照片显示状态")
    public Response<Void> updateVisibleStatus(@Valid @RequestBody UpdatePhotoVisibleStatusReqVO reqVO) {
        return adminPhotoService.updateVisibleStatus(reqVO);
    }

    @PostMapping("/delete")
    @ApiOperationLog(description = "删除照片")
    public Response<Void> deletePhoto(@Valid @RequestBody DeletePhotoReqVO reqVO) {
        return adminPhotoService.deletePhoto(reqVO);
    }

    @PostMapping("/category/list")
    @ApiOperationLog(description = "查询照片分类列表")
    public Response<List<PhotoCategoryListRspVO>> listPhotoCategories() {
        return adminPhotoService.listPhotoCategories();
    }

    @PostMapping("/category/save")
    @ApiOperationLog(description = "保存照片分类")
    public Response<Long> savePhotoCategory(@Valid @RequestBody SavePhotoCategoryReqVO reqVO) {
        return adminPhotoService.savePhotoCategory(reqVO);
    }

    @PostMapping("/category/delete")
    @ApiOperationLog(description = "删除照片分类")
    public Response<Void> deletePhotoCategory(@Valid @RequestBody DeletePhotoCategoryReqVO reqVO) {
        return adminPhotoService.deletePhotoCategory(reqVO);
    }
}
