package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.SpaceReviewSubmissionDO;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

public interface SpaceReviewSubmissionMapper extends BaseMapper<SpaceReviewSubmissionDO> {

    default SpaceReviewSubmissionDO selectByIdAndSpaceId(Long id, Long spaceId) {
        if (id == null || spaceId == null) {
            return null;
        }
        return selectOne(new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getId, id)
                .eq(SpaceReviewSubmissionDO::getSpaceId, spaceId));
    }

    default SpaceReviewSubmissionDO selectPendingBySpaceId(Long spaceId) {
        return selectOne(new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getSpaceId, spaceId)
                .eq(SpaceReviewSubmissionDO::getStatus, "PENDING")
                .orderByDesc(SpaceReviewSubmissionDO::getId)
                .last("LIMIT 1"));
    }

    default List<SpaceReviewSubmissionDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getSpaceId, spaceId)
                .orderByDesc(SpaceReviewSubmissionDO::getId));
    }

    default List<SpaceReviewSubmissionDO> selectPendingBySpaceIds(Collection<Long> spaceIds) {
        if (spaceIds == null || spaceIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .in(SpaceReviewSubmissionDO::getSpaceId, spaceIds)
                .eq(SpaceReviewSubmissionDO::getStatus, "PENDING"));
    }

    default List<SpaceReviewSubmissionDO> selectLatestHandledBySpaceIds(Collection<Long> spaceIds) {
        if (spaceIds == null || spaceIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .in(SpaceReviewSubmissionDO::getSpaceId, spaceIds)
                .in(SpaceReviewSubmissionDO::getStatus, "APPROVED", "REJECTED", "PARTIALLY_APPROVED")
                .orderByDesc(SpaceReviewSubmissionDO::getHandledAt)
                .orderByDesc(SpaceReviewSubmissionDO::getId));
    }

    /**
     * 后台审核列表：可按提交状态、空间、审核类型、提交人、时间范围筛选，
     * 并通过空间名称 / spaceCode 模糊搜索。
     */
    default IPage<SpaceReviewSubmissionDO> selectAdminPage(long current, long size, String status,
                                                            Long spaceId, String reviewType,
                                                            Long submittedBy, String keyword,
                                                            LocalDateTime startTime,
                                                            LocalDateTime endTime) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .eq(status != null, SpaceReviewSubmissionDO::getStatus, status)
                .eq(spaceId != null, SpaceReviewSubmissionDO::getSpaceId, spaceId)
                .eq(reviewType != null, SpaceReviewSubmissionDO::getReviewType, reviewType)
                .eq(submittedBy != null, SpaceReviewSubmissionDO::getSubmittedBy, submittedBy)
                .ge(startTime != null, SpaceReviewSubmissionDO::getCreateTime, startTime)
                .le(endTime != null, SpaceReviewSubmissionDO::getCreateTime, endTime)
                .and(keyword != null, w -> w.apply(
                        "EXISTS (SELECT 1 FROM couple_space cs WHERE cs.id = space_review_submission.space_id "
                                + "AND (cs.space_name LIKE {0} OR cs.space_code LIKE {0}))",
                        "%" + (keyword == null ? "" : keyword) + "%"))
                .orderByDesc(SpaceReviewSubmissionDO::getCreateTime)
                .orderByDesc(SpaceReviewSubmissionDO::getId));
    }

    /**
     * 审核通过 / 驳回的条件更新：只有仍为 PENDING 的提交才能被处理，天然幂等。
     */
    default int resolve(Long id, Long spaceId, String expectedStatus, String targetStatus,
                        Long handledBy, LocalDateTime handledAt, String rejectReason,
                        LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getId, id)
                .eq(SpaceReviewSubmissionDO::getSpaceId, spaceId)
                .eq(SpaceReviewSubmissionDO::getStatus, expectedStatus)
                .set(SpaceReviewSubmissionDO::getStatus, targetStatus)
                .set(SpaceReviewSubmissionDO::getPendingFlag, null)
                .set(SpaceReviewSubmissionDO::getHandledBy, handledBy)
                .set(SpaceReviewSubmissionDO::getHandledAt, handledAt)
                .set(SpaceReviewSubmissionDO::getRejectReason, rejectReason)
                .set(SpaceReviewSubmissionDO::getUpdateTime, updateTime));
    }

    default int touch(Long id, Long spaceId, String reviewType, Integer baseRevision,
                      String changeSummary, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getId, id)
                .eq(SpaceReviewSubmissionDO::getSpaceId, spaceId)
                .eq(SpaceReviewSubmissionDO::getStatus, "PENDING")
                .set(SpaceReviewSubmissionDO::getReviewType, reviewType)
                .set(SpaceReviewSubmissionDO::getBaseRevision, baseRevision)
                .set(SpaceReviewSubmissionDO::getChangeSummary, changeSummary)
                .set(SpaceReviewSubmissionDO::getUpdateTime, updateTime));
    }

    /**
     * 提交仍有待审核项时刷新摘要与最近处理原因，但不结束提交。
     */
    default int touchPending(Long id, Long spaceId, String rejectReason, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getId, id)
                .eq(SpaceReviewSubmissionDO::getSpaceId, spaceId)
                .eq(SpaceReviewSubmissionDO::getStatus, "PENDING")
                .set(rejectReason != null, SpaceReviewSubmissionDO::getRejectReason,
                        rejectReason == null ? "" : rejectReason)
                .set(SpaceReviewSubmissionDO::getUpdateTime, updateTime));
    }

    default long countByStatus(String status) {
        Long count = selectCount(new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getStatus, status));
        return count == null ? 0L : count;
    }

    default long countByStatusSince(String status, LocalDateTime since) {
        Long count = selectCount(new LambdaQueryWrapper<SpaceReviewSubmissionDO>()
                .eq(SpaceReviewSubmissionDO::getStatus, status)
                .ge(SpaceReviewSubmissionDO::getCreateTime, since));
        return count == null ? 0L : count;
    }

    default long countPendingSpaces() {
        return selectMaps(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SpaceReviewSubmissionDO>()
                .select("COUNT(DISTINCT space_id) AS total")
                .eq("status", "PENDING"))
                .stream()
                .findFirst()
                .map(row -> {
                    Object total = row.get("total");
                    return total instanceof Number ? ((Number) total).longValue() : 0L;
                })
                .orElse(0L);
    }
}
