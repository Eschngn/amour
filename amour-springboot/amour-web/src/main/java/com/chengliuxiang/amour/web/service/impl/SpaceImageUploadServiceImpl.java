package com.chengliuxiang.amour.web.service.impl;

import com.chengliuxiang.amour.admin.utils.AliyunOSSUtil;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.file.UploadImageRspVO;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import com.chengliuxiang.amour.web.service.SpaceImageUploadService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Service
@Slf4j
public class SpaceImageUploadServiceImpl implements SpaceImageUploadService {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = new HashSet<>(Arrays.asList(
            "jpg", "jpeg", "png", "webp", "gif"));

    @Resource
    private SpaceContentAccessService spaceContentAccessService;

    @Resource
    private AliyunOSSUtil aliyunOSSUtil;

    @Override
    public Response<UploadImageRspVO> uploadImage(MultipartFile file) {
        // 先校验登录态、有效成员关系与空间状态，未授权请求不会触碰对象存储。
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        validateImage(file);

        try {
            String subFolder = "space/" + access.getSpaceId();
            String url = aliyunOSSUtil.uploadFile(file, subFolder);
            return Response.success(UploadImageRspVO.builder().url(url).build());
        } catch (Exception e) {
            log.error("空间图片上传失败, spaceId: {}", access.getSpaceId(), e);
            throw new BizException(ResponseCodeEnum.FILE_UPLOAD_FAILED);
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException(ResponseCodeEnum.SPACE_IMAGE_INVALID);
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BizException(ResponseCodeEnum.SPACE_IMAGE_INVALID);
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new BizException(ResponseCodeEnum.SPACE_IMAGE_INVALID);
        }
        String originalFileName = file.getOriginalFilename();
        int dotIndex = originalFileName == null ? -1 : originalFileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalFileName.length() - 1) {
            throw new BizException(ResponseCodeEnum.SPACE_IMAGE_INVALID);
        }
        String extension = originalFileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BizException(ResponseCodeEnum.SPACE_IMAGE_INVALID);
        }
    }
}
