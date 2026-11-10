package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.Data;

/**
 * 照片分类列表请求。无空格空间过滤时需要跨空间权限。
 */
@Data
public class PhotoCategoryListReqVO {

    private Long spaceId;
}
