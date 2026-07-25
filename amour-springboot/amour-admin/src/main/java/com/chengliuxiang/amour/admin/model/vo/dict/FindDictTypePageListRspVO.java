package com.chengliuxiang.amour.admin.model.vo.dict;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindDictTypePageListRspVO {

    private Long id;

    private String dictName;

    private String dictType;

    private Boolean status;

    private Integer sortOrder;

    private String remark;

    private Long itemCount;

    private String updateTime;
}
