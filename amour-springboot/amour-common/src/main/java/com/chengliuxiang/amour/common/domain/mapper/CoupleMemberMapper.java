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

    default int updateMember(CoupleMemberDO member) {
        return update(member, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getId, member.getId())
                .eq(CoupleMemberDO::getSpaceId, member.getSpaceId()));
    }

    default int leave(Long spaceId, Long id, Integer status, LocalDateTime leftAt, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getId, id)
                .set(CoupleMemberDO::getStatus, status)
                .set(CoupleMemberDO::getLeftAt, leftAt)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }
}
