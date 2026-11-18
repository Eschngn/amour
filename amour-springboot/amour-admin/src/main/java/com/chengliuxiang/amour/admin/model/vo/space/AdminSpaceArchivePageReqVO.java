package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.Data;

/**
 * 后台「已销毁空间留档」分页查询请求。
 *
 * <p>默认只看尚未恢复的留档；restored=true 时查看已恢复的历史留档。</p>
 */
@Data
public class AdminSpaceArchivePageReqVO {

    private Long current;

    private Long size;

    /**
     * 关键字：空间名称或 spaceCode。
     */
    private String keyword;

    /**
     * 精确按空间 ID 过滤。
     */
    private Long spaceId;

    /**
     * 是否只看已恢复的留档：null 表示不限制。
     */
    private Boolean restored;
}
