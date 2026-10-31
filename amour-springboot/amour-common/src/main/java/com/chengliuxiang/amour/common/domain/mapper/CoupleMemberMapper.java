package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;

import java.time.LocalDateTime;
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

    default int insertMember(CoupleMemberDO member) {
        return insert(member);
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
