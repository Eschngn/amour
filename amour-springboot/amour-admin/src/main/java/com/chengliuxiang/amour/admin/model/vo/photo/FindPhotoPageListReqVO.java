package com.chengliuxiang.amour.admin.model.vo.photo;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class FindPhotoPageListReqVO extends BasePageQuery {

    private Long spaceId;

    private String title;

    private Long photoCategoryId;

    private Integer visibility;

    private Boolean includeDeleted;

    /**
     * @deprecated 请使用 visibility
     */
    @Deprecated
    private Boolean isVisible;
}
