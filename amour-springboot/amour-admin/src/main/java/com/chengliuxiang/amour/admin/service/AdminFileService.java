package com.chengliuxiang.amour.admin.service;


import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.web.multipart.MultipartFile;

/**
 * @author Wilson
 * @Description: TODO
 * @date 2024/9/21 14:45
 */
public interface AdminFileService {
    /**
     * 上传文件
     * @param file
     * @return
     */
    Response uploadFile(MultipartFile file);
}
