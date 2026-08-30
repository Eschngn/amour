package com.chengliuxiang.amour.admin.model.vo.user;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;

@Data
public class UserPageReqVO extends BasePageQuery {
    private String keyword;
    private Integer status;
}
