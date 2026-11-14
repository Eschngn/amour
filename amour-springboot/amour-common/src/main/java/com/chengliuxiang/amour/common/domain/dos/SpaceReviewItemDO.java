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
 * 审核提交中的单个审核项。
 *
 * <p>snapshot_json 保存该项的完整公开版本；管理员通过后才写入
 * space_published_item。item_id 对 SPACE / HOME_CONFIG 固定为 0。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("space_review_item")
public class SpaceReviewItemDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long submissionId;

    private Long spaceId;

    /**
     * SPACE / HOME_CONFIG / STORY / PHOTO / ANNIVERSARY
     */
    private String itemType;

    private Long itemId;

    /**
     * FIRST_PUBLISH / CREATE / UPDATE / REPUBLISH
     */
    private String action;

    /**
     * 生成快照时对应工作数据的版本号。
     */
    private Integer baseRevision;

    private String snapshotJson;

    /**
     * PENDING / APPROVED / REJECTED / WITHDRAWN / SUPERSEDED
     */
    private String itemStatus;

    /**
     * 项级驳回原因，仅当前审核项有效；通过、撤回时为空字符串。
     */
    private String rejectReason;

    /**
     * 处理该审核项的管理员用户ID。
     */
    private Long handledBy;

    /**
     * 项级处理时间。
     */
    private LocalDateTime handledAt;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
