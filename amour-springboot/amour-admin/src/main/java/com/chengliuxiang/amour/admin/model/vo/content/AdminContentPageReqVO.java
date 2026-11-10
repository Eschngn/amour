package com.chengliuxiang.amour.admin.model.vo.content;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AdminContentPageReqVO extends BasePageQuery {

    /**
     * 目标空间。缺少该字段时必须拥有 admin:content:cross-space。
     */
    private Long spaceId;

    /**
     * story / photo / anniversary / message
     */
    private String contentType;

    private String keyword;

    private Integer visibility;

    /**
     * 是否同时返回逻辑删除内容，默认 false。
     */
    private Boolean includeDeleted;
}
