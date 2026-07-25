package com.chengliuxiang.amour.admin.model.vo.config;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class FindSiteConfigPageListReqVO extends BasePageQuery {
    private String keyword;
    private String valueType;
}
