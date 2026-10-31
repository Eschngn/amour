package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.CoupleInvitationDO;

import java.time.LocalDateTime;
import java.util.List;

public interface CoupleInvitationMapper extends BaseMapper<CoupleInvitationDO> {

    default CoupleInvitationDO selectByTokenHash(String tokenHash) {
        return selectOne(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getTokenHash, tokenHash));
    }

    default List<CoupleInvitationDO> selectPendingBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .orderByDesc(CoupleInvitationDO::getId));
    }

    default List<CoupleInvitationDO> selectPendingByInvitee(Long inviteeUserId) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getInviteeUserId, inviteeUserId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .orderByDesc(CoupleInvitationDO::getId));
    }

    default CoupleInvitationDO selectPendingBySpaceAndInvitee(Long spaceId, Long inviteeUserId) {
        return selectOne(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getInviteeUserId, inviteeUserId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .orderByDesc(CoupleInvitationDO::getId)
                .last("LIMIT 1"));
    }

    default List<CoupleInvitationDO> selectExpiredPending(LocalDateTime now) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getStatus, 0)
                .le(CoupleInvitationDO::getExpiresAt, now));
    }

    default int insertInvitation(CoupleInvitationDO invitation) {
        return insert(invitation);
    }

    default int updateInvitation(CoupleInvitationDO invitation) {
        return update(invitation, new LambdaUpdateWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getId, invitation.getId())
                .eq(CoupleInvitationDO::getSpaceId, invitation.getSpaceId()));
    }
}
