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
     * 目标空间；缺少时要求跨空间权限。
     */
    private Long spaceId;

    /**
     * 留言内容关键字，可选。
     */
    private String content;

    /**
     * 是否同时返回逻辑删除留言。
     */
    private Boolean includeDeleted;
}
