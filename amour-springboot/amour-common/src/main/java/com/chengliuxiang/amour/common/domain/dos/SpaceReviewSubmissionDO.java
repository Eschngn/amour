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
 * 情侣空间公开审核提交。
 *
 * <p>一次保存可以包含多个审核项；用户再次编辑同一对象时，最新的待审核快照
 * 会覆盖当前 PENDING 提交中的审核项，而不是再新建一条提交。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("space_review_submission")
public class SpaceReviewSubmissionDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    private Long submittedBy;

    /**
     * PENDING / APPROVED / REJECTED / PARTIALLY_APPROVED / WITHDRAWN / SUPERSEDED
     */
    private String status;

    /**
     * FIRST_PUBLISH / CONTENT_UPDATE / REPUBLISH
     */
    private String reviewType;

    /**
     * 提交时空间或内容的工作版本号，用于审核通过与最新版本做并发校验。
     */
    private Integer baseRevision;

    /**
     * 待审核状态标记：PENDING 时为 1，其它状态为 NULL。
     * 唯一索引 (space_id, pending_flag) 保证同一空间最多只有一条待审核提交。
     */
    private Integer pendingFlag;

    private String changeSummary;

    private Long handledBy;

    private LocalDateTime handledAt;

    private String rejectReason;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
