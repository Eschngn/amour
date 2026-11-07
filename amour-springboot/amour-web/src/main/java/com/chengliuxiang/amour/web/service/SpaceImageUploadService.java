package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.file.UploadImageRspVO;
import org.springframework.web.multipart.MultipartFile;

public interface SpaceImageUploadService {

    /**
     * 用户端空间图片上传：目标空间由登录态与有效成员关系推导，不接受客户端指定空间。
     */
    Response<UploadImageRspVO> uploadImage(MultipartFile file);
}
