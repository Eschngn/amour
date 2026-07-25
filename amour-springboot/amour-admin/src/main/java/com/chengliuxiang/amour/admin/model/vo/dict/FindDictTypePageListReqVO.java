package com.chengliuxiang.amour.admin.model.vo.dict;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class FindDictTypePageListReqVO extends BasePageQuery {

    private String keyword;
}
