package com.chengliuxiang.amour.web.model.vo.gallery;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 恋爱广场公开空间分页查询参数。
 * size 由服务端统一限制最大值，避免一次拉取过多数据。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class GallerySpacePageQueryReqVO extends BasePageQuery {
}
