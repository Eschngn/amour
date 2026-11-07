package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceUnbindRequestDO;

import java.time.LocalDateTime;
import java.util.List;

public interface CoupleSpaceUnbindRequestMapper extends BaseMapper<CoupleSpaceUnbindRequestDO> {

    int UNBIND_STATUS_PENDING = 0;
    int UNBIND_STATUS_APPROVED = 1;
    int UNBIND_STATUS_REJECTED = 2;
    int UNBIND_STATUS_CANCELLED = 3;

    default CoupleSpaceUnbindRequestDO findById(Long id) {
        return selectById(id);
    }

    /**
     * 查询空间当前唯一的待处理解绑申请。
     * 唯一索引保证同一空间至多一条 pending 记录。
     */
    default CoupleSpaceUnbindRequestDO selectPendingBySpaceId(Long spaceId) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceUnbindRequestDO>()
                .eq(CoupleSpaceUnbindRequestDO::getSpaceId, spaceId)
                .eq(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_PENDING)
                .orderByDesc(CoupleSpaceUnbindRequestDO::getId)
                .last("LIMIT 1"));
    }

    /**
     * 查询空间最近一次已结束（同意/拒绝/取消）的解绑申请。
     * 用于让发起人在申请被拒绝后看到明确结果，不返回仍在 pending 的申请。
     */
    default CoupleSpaceUnbindRequestDO selectLatestResolvedBySpaceId(Long spaceId) {
        return selectOne(new LambdaQueryWrapper<CoupleSpaceUnbindRequestDO>()
                .eq(CoupleSpaceUnbindRequestDO::getSpaceId, spaceId)
                .ne(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_PENDING)
                .orderByDesc(CoupleSpaceUnbindRequestDO::getId)
                .last("LIMIT 1"));
    }

    default List<CoupleSpaceUnbindRequestDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleSpaceUnbindRequestDO>()
                .eq(CoupleSpaceUnbindRequestDO::getSpaceId, spaceId)
                .orderByDesc(CoupleSpaceUnbindRequestDO::getId));
    }

    default int insertRequest(CoupleSpaceUnbindRequestDO request) {
        return insert(request);
    }

    /**
     * 发起人取消：只有 pending 且发起人本人才能成功，返回 0 表示已被处理或无权取消。
     */
    default int cancel(Long id, Long spaceId, Long requesterUserId, LocalDateTime resolvedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceUnbindRequestDO>()
                .eq(CoupleSpaceUnbindRequestDO::getId, id)
                .eq(CoupleSpaceUnbindRequestDO::getSpaceId, spaceId)
                .eq(CoupleSpaceUnbindRequestDO::getRequesterUserId, requesterUserId)
                .eq(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_PENDING)
                .set(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_CANCELLED)
                .set(CoupleSpaceUnbindRequestDO::getResolvedAt, resolvedAt)
                .set(CoupleSpaceUnbindRequestDO::getResolvedByUserId, requesterUserId)
                .set(CoupleSpaceUnbindRequestDO::getUpdateTime, resolvedAt));
    }

    /**
     * 另一方拒绝：只有 pending 才能拒绝，且不能由发起人自己拒绝。
     */
    default int reject(Long id, Long spaceId, Long resolverUserId, LocalDateTime resolvedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceUnbindRequestDO>()
                .eq(CoupleSpaceUnbindRequestDO::getId, id)
                .eq(CoupleSpaceUnbindRequestDO::getSpaceId, spaceId)
                .ne(CoupleSpaceUnbindRequestDO::getRequesterUserId, resolverUserId)
                .eq(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_PENDING)
                .set(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_REJECTED)
                .set(CoupleSpaceUnbindRequestDO::getResolvedAt, resolvedAt)
                .set(CoupleSpaceUnbindRequestDO::getResolvedByUserId, resolverUserId)
                .set(CoupleSpaceUnbindRequestDO::getUpdateTime, resolvedAt));
    }

    /**
     * 另一方同意解绑：只有 pending 才能同意，且不能由发起人自己确认。
     * 返回 0 表示申请已被并发处理，调用方必须回滚整笔事务。
     */
    default int approve(Long id, Long spaceId, Long resolverUserId, LocalDateTime resolvedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceUnbindRequestDO>()
                .eq(CoupleSpaceUnbindRequestDO::getId, id)
                .eq(CoupleSpaceUnbindRequestDO::getSpaceId, spaceId)
                .ne(CoupleSpaceUnbindRequestDO::getRequesterUserId, resolverUserId)
                .eq(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_PENDING)
                .set(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_APPROVED)
                .set(CoupleSpaceUnbindRequestDO::getResolvedAt, resolvedAt)
                .set(CoupleSpaceUnbindRequestDO::getResolvedByUserId, resolverUserId)
                .set(CoupleSpaceUnbindRequestDO::getUpdateTime, resolvedAt));
    }

    /**
     * 空间完成解绑后，把仍然 pending 的申请统一标记为已取消（历史记录保留，不物理删除）。
     */
    default int cancelPendingBySpaceId(Long spaceId, Long resolverUserId, LocalDateTime resolvedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleSpaceUnbindRequestDO>()
                .eq(CoupleSpaceUnbindRequestDO::getSpaceId, spaceId)
                .eq(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_PENDING)
                .set(CoupleSpaceUnbindRequestDO::getStatus, UNBIND_STATUS_CANCELLED)
                .set(CoupleSpaceUnbindRequestDO::getResolvedAt, resolvedAt)
                .set(CoupleSpaceUnbindRequestDO::getResolvedByUserId, resolverUserId)
                .set(CoupleSpaceUnbindRequestDO::getUpdateTime, resolvedAt));
    }
}
