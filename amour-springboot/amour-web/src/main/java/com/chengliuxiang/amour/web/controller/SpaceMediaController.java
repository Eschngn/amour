package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.file.UploadImageRspVO;
import com.chengliuxiang.amour.web.service.SpaceImageUploadService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;

@RestController
@RequestMapping("/space/media")
public class SpaceMediaController {

    @Resource
    private SpaceImageUploadService spaceImageUploadService;

    /**
     * 用户端空间图片上传。
     *
     * <p>与 /admin/file/upload 完全分离：这里使用前台登录态，目标目录由服务端按当前空间生成，
     * 客户端不能指定 spaceId 或存储路径。</p>
     */
    @PostMapping("/upload")
    @ApiOperationLog(description = "用户端空间图片上传")
    public Response<UploadImageRspVO> uploadImage(@RequestParam("file") MultipartFile file) {
        return spaceImageUploadService.uploadImage(file);
    }
}
