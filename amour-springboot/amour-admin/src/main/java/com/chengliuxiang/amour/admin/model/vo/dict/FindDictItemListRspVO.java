package com.chengliuxiang.amour.admin.model.vo.dict;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindDictItemListRspVO {

    private Long id;

    private String dictType;

    private String itemLabel;

    private String itemValue;

    private String configValue;

    private String cssClass;

    private Integer sortOrder;

    private Boolean status;

    private String remark;

    private String updateTime;
}
