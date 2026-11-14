package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.SpaceReviewItemDO;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

public interface SpaceReviewItemMapper extends BaseMapper<SpaceReviewItemDO> {

    default List<SpaceReviewItemDO> selectBySubmissionId(Long submissionId) {
        return selectList(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .orderByAsc(SpaceReviewItemDO::getItemType)
                .orderByAsc(SpaceReviewItemDO::getItemId));
    }

    default List<SpaceReviewItemDO> selectBySubmissionIds(Collection<Long> submissionIds) {
        if (submissionIds == null || submissionIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .in(SpaceReviewItemDO::getSubmissionId, submissionIds));
    }

    default List<SpaceReviewItemDO> selectPendingBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSpaceId, spaceId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .orderByAsc(SpaceReviewItemDO::getItemType)
                .orderByAsc(SpaceReviewItemDO::getItemId));
    }

    default SpaceReviewItemDO selectPendingItem(Long submissionId, String itemType, Long itemId) {
        return selectOne(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .last("LIMIT 1"));
    }

    default SpaceReviewItemDO selectBySubmissionAndTarget(Long submissionId, String itemType,
                                                          Long itemId) {
        return selectOne(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .last("LIMIT 1"));
    }

    /**
     * 已处理项在同一待审核提交内被用户重新修改时，复用原行重新进入待审核，
     * 避免唯一索引 (submission_id, item_type, item_id) 冲突。
     */
    default int resetItemToPending(Long id, String action, Integer baseRevision,
                                   String snapshotJson, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getId, id)
                .ne(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getRejectReason, "")
                .set(SpaceReviewItemDO::getHandledBy, null)
                .set(SpaceReviewItemDO::getHandledAt, null)
                .set(SpaceReviewItemDO::getAction, action)
                .set(SpaceReviewItemDO::getBaseRevision, baseRevision)
                .set(SpaceReviewItemDO::getSnapshotJson, snapshotJson)
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    default List<SpaceReviewItemDO> selectLatestRejectedBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSpaceId, spaceId)
                .eq(SpaceReviewItemDO::getItemStatus, "REJECTED")
                .orderByDesc(SpaceReviewItemDO::getUpdateTime)
                .orderByDesc(SpaceReviewItemDO::getId));
    }

    default int deleteBySubmissionId(Long submissionId) {
        return delete(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId));
    }

    default int deletePendingItem(Long submissionId, String itemType, Long itemId) {
        return delete(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING"));
    }

    default int updateSnapshot(Long id, String action, Integer baseRevision, String snapshotJson,
                               LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getId, id)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getAction, action)
                .set(SpaceReviewItemDO::getBaseRevision, baseRevision)
                .set(SpaceReviewItemDO::getSnapshotJson, snapshotJson)
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    default int resolveBySubmissionId(Long submissionId, String targetStatus, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, targetStatus)
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    /**
     * 批量处理整单待审核项，同时写入项级驳回原因与处理人。
     */
    default int resolveBySubmissionIdWithDecision(Long submissionId, String targetStatus,
                                                  String rejectReason, Long handledBy,
                                                  LocalDateTime handledAt) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, targetStatus)
                .set(SpaceReviewItemDO::getRejectReason,
                        rejectReason == null ? "" : rejectReason)
                .set(SpaceReviewItemDO::getHandledBy, handledBy)
                .set(SpaceReviewItemDO::getHandledAt, handledAt)
                .set(SpaceReviewItemDO::getUpdateTime, handledAt));
    }

    default int resolveItem(Long submissionId, String itemType, Long itemId, String targetStatus,
                            LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, targetStatus)
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    /**
     * 条件更新单个审核项：只有仍为 PENDING 的项能被处理，保证重复/并发处理幂等。
     */
    default int resolveItemWithDecision(Long submissionId, String itemType, Long itemId,
                                        String targetStatus, String rejectReason, Long handledBy,
                                        LocalDateTime handledAt) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, targetStatus)
                .set(SpaceReviewItemDO::getRejectReason,
                        rejectReason == null ? "" : rejectReason)
                .set(SpaceReviewItemDO::getHandledBy, handledBy)
                .set(SpaceReviewItemDO::getHandledAt, handledAt)
                .set(SpaceReviewItemDO::getUpdateTime, handledAt));
    }

    /**
     * 空间信息与主页配置来自同一份空间工作数据；通过其中一项后空间版本号会自增，
     * 需要同步同提交内剩余的待审核空间级项，避免它们被误判为过期版本。
     */
    default int syncSpaceLevelBaseRevision(Long submissionId, int baseRevision,
                                           LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSubmissionId, submissionId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .in(SpaceReviewItemDO::getItemType, "SPACE", "HOME_CONFIG")
                .set(SpaceReviewItemDO::getBaseRevision, baseRevision)
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    default int withdrawPendingBySpaceId(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSpaceId, spaceId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, "WITHDRAWN")
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    default int markRejectedByTarget(Long spaceId, String itemType, Long itemId,
                                     LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSpaceId, spaceId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, "REJECTED")
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    /**
     * 管理员下架已公开内容时，同目标的待审核版本随之失效。
     * 这属于被下架动作替代，不应伪装成审核驳回。
     */
    default int markSupersededByTarget(Long spaceId, String itemType, Long itemId,
                                       LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSpaceId, spaceId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .set(SpaceReviewItemDO::getItemStatus, "SUPERSEDED")
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    /**
     * 新版本审核通过后，把同一目标历史的驳回记录标记为已被新版本替代，
     * 避免用户端继续显示过期的「审核未通过」。
     */
    default int supersedeRejectedByTarget(Long spaceId, String itemType, Long itemId,
                                          LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getSpaceId, spaceId)
                .eq(SpaceReviewItemDO::getItemType, itemType)
                .eq(SpaceReviewItemDO::getItemId, itemId)
                .eq(SpaceReviewItemDO::getItemStatus, "REJECTED")
                .set(SpaceReviewItemDO::getItemStatus, "SUPERSEDED")
                .set(SpaceReviewItemDO::getUpdateTime, updateTime));
    }

    default long countPendingItems() {
        Long count = selectCount(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING"));
        return count == null ? 0L : count;
    }

    default long countPendingContentItems() {
        Long count = selectCount(new LambdaQueryWrapper<SpaceReviewItemDO>()
                .eq(SpaceReviewItemDO::getItemStatus, "PENDING")
                .in(SpaceReviewItemDO::getItemType, "STORY", "PHOTO", "ANNIVERSARY"));
        return count == null ? 0L : count;
    }
}
