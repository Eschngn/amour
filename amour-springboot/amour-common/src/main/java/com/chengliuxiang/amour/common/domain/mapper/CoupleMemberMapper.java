package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

public interface CoupleMemberMapper extends BaseMapper<CoupleMemberDO> {

    default CoupleMemberDO selectBySpaceAndUser(Long spaceId, Long userId) {
        return selectOne(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getUserId, userId));
    }

    default List<CoupleMemberDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .orderByAsc(CoupleMemberDO::getId));
    }

    /**
     * 批量查询多个空间的全部成员关系（含历史已退出成员），供后台列表组装。
     */
    default List<CoupleMemberDO> selectBySpaceIds(Collection<Long> spaceIds) {
        if (spaceIds == null || spaceIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .in(CoupleMemberDO::getSpaceId, spaceIds)
                .orderByAsc(CoupleMemberDO::getId));
    }

    default List<CoupleMemberDO> selectActiveBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getStatus, 1)
                .orderByAsc(CoupleMemberDO::getId));
    }

    /**
     * 批量查询多个空间的有效成员，供公开空间列表一次性组装成员信息。
     */
    default List<CoupleMemberDO> selectActiveBySpaceIds(Collection<Long> spaceIds) {
        if (spaceIds == null || spaceIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .in(CoupleMemberDO::getSpaceId, spaceIds)
                .eq(CoupleMemberDO::getStatus, 1)
                .orderByAsc(CoupleMemberDO::getId));
    }

    default List<CoupleMemberDO> selectActiveByUserId(Long userId) {
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getUserId, userId)
                .eq(CoupleMemberDO::getStatus, 1)
                .orderByDesc(CoupleMemberDO::getId));
    }

    default Long countActiveBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getStatus, 1));
    }

    /**
     * 统计用户当前有效加入的空间数量。
     */
    /**
     * 查询用户在「未解绑空间」中的有效成员关系（status=5 的历史残留会被排除）。
     * 解绑后双方都应被视为没有情侣空间，因此业务判断一律使用该方法而非 countActiveByUserId。
     */
    default List<CoupleMemberDO> selectActiveInLiveSpaces(Long userId) {
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getUserId, userId)
                .eq(CoupleMemberDO::getStatus, 1)
                .apply("space_id IN (SELECT id FROM couple_space WHERE status <> 5)")
                .orderByDesc(CoupleMemberDO::getId));
    }

    default Long countActiveByUserId(Long userId) {
        return selectCount(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getUserId, userId)
                .eq(CoupleMemberDO::getStatus, 1));
    }

    default int insertMember(CoupleMemberDO member) {
        return insert(member);
    }

    /**
     * 将已存在的邀请中 / 已退出 / 已移除成员关系重新激活。
     * 条件更新保证并发下只有一次激活成功。
     */
    default int activate(Long spaceId, Long userId, Integer memberRole,
                         LocalDateTime joinedAt, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getUserId, userId)
                .ne(CoupleMemberDO::getStatus, 1)
                .set(CoupleMemberDO::getStatus, 1)
                .set(CoupleMemberDO::getMemberRole, memberRole)
                .set(CoupleMemberDO::getJoinedAt, joinedAt)
                .set(CoupleMemberDO::getLeftAt, null)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }

    /**
     * 管理员人工恢复：只把该空间内「已退出」的历史成员恢复为有效成员。
     * 返回受影响行数，调用方必须校验恰好恢复两人，否则回滚事务。
     */
    default int restoreAllLeft(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getStatus, 3)
                .set(CoupleMemberDO::getStatus, 1)
                .set(CoupleMemberDO::getLeftAt, null)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }

    /**
     * 解绑确认：把空间内所有有效成员一次性标记为退出，并写入退出时间。
     * 条件更新保证并发下不会被重复处理，返回受影响行数供调用方校验「两人都在」。
     */
    default int leaveAllActive(Long spaceId, Integer status, LocalDateTime leftAt, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getStatus, 1)
                .set(CoupleMemberDO::getStatus, status)
                .set(CoupleMemberDO::getLeftAt, leftAt)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }
}
