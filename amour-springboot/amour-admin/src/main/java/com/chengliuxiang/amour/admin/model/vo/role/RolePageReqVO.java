package com.chengliuxiang.amour.admin.model.vo.role;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RolePageReqVO extends BasePageQuery {
    private String keyword;
}
