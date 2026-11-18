package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 创建者销毁情侣空间的结果。
 *
 * <p>销毁成功后空间状态变为 6（已销毁），对普通用户完全不可见、不可访问；
 * 数据不做物理删除，平台管理员可以按留档恢复。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceDestroyVO {

    private Long spaceId;

    private String spaceCode;

    /**
     * 销毁后的空间状态，固定为 6（已销毁）。
     */
    private Integer status;

    private String statusText;

    /**
     * 销毁时间。
     */
    private LocalDateTime destroyedAt;

    /**
     * 留档 ID，仅用于后台排障与审计关联，不包含任何业务内容。
     */
    private Long archiveId;

    /**
     * 是否本次请求真正执行了销毁。重复提交按幂等成功返回时 alsoDestroyed=false。
     */
    private Boolean destroyed;
}
