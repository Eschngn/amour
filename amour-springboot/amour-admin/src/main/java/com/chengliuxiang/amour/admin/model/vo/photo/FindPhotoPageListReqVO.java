package com.chengliuxiang.amour.admin.model.vo.photo;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class FindPhotoPageListReqVO extends BasePageQuery {

    private String title;

    private Long photoCategoryId;

    private Boolean isVisible;
}
