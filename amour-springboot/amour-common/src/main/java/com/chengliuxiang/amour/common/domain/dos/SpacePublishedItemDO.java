package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 已审核并已发布的公开版本快照。
 *
 * <p>恋爱广场只读取这张表，待审核、已驳回、已撤回和管理员下架的数据都不会进入广场。
 * 一条记录对应 space_review_item 中的 item_type + item_id。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("space_published_item")
public class SpacePublishedItemDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    /**
     * SPACE / HOME_CONFIG / STORY / PHOTO / ANNIVERSARY
     */
    private String itemType;

    private Long itemId;

    /**
     * 写入时对应的工作数据版本号。
     */
    private Integer revision;

    private String snapshotJson;

    /**
     * 1-已发布（广场可见） 0-已下架（广场不可见）
     */
    private Integer publishStatus;

    private LocalDateTime publishedAt;

    private LocalDateTime unpublishedAt;

    private String unpublishReason;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
