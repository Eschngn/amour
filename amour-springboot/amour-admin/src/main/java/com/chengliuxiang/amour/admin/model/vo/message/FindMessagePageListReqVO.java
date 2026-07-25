package com.chengliuxiang.amour.admin.model.vo.message;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class FindMessagePageListReqVO extends BasePageQuery {
    /**
     * 留言内容关键字，可选。
     */
    private String content;
}
