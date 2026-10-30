package com.chengliuxiang.amour.admin.model.vo.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindSiteConfigPageListRspVO {
    private Long id;
    private String configKey;
    private String configName;
    private String configValue;
    private String valueType;
    private Integer sortOrder;
    private String remark;
    private String updateTime;
}
