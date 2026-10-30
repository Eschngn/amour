package com.chengliuxiang.amour.web.model.vo.photo;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class PhotoPageQueryReqVO extends BasePageQuery {

    /**
     * 为空表示查询全部分类。
     */
    private Long photoCategoryId;
}
