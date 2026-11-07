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

    default CoupleInvitationDO findById(Long id) {
        return selectById(id);
    }

    default List<CoupleInvitationDO> selectPendingBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .orderByDesc(CoupleInvitationDO::getId));
    }

    /**
     * 查询空间内尚未过期的待接受邀请。
     */
    default List<CoupleInvitationDO> selectPendingBySpaceId(Long spaceId, LocalDateTime now) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .gt(CoupleInvitationDO::getExpiresAt, now)
                .orderByDesc(CoupleInvitationDO::getId));
    }

    default List<CoupleInvitationDO> selectPendingByInvitee(Long inviteeUserId) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getInviteeUserId, inviteeUserId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .orderByDesc(CoupleInvitationDO::getId));
    }

    /**
     * 查询指定用户收到的、尚未过期的待接受邀请。
     */
    default List<CoupleInvitationDO> selectPendingByInvitee(Long inviteeUserId, LocalDateTime now) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getInviteeUserId, inviteeUserId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .gt(CoupleInvitationDO::getExpiresAt, now)
                .orderByDesc(CoupleInvitationDO::getId));
    }

    default List<CoupleInvitationDO> selectExpiredPending(LocalDateTime now) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getStatus, 0)
                .le(CoupleInvitationDO::getExpiresAt, now));
    }

    default Long countPendingBySpaceId(Long spaceId, LocalDateTime now) {
        return selectCount(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .gt(CoupleInvitationDO::getExpiresAt, now));
    }

    default int insertInvitation(CoupleInvitationDO invitation) {
        return insert(invitation);
    }

    default int updateInvitation(CoupleInvitationDO invitation) {
        return update(invitation, new LambdaUpdateWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getId, invitation.getId())
                .eq(CoupleInvitationDO::getSpaceId, invitation.getSpaceId()));
    }

    /**
     * 原子接受邀请：只有仍处于待接受状态且未过期时才能成功。
     */
    default int claim(Long id, LocalDateTime acceptedAt) {
        return update(null, new LambdaUpdateWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getId, id)
                .eq(CoupleInvitationDO::getStatus, 0)
                .gt(CoupleInvitationDO::getExpiresAt, acceptedAt)
                .set(CoupleInvitationDO::getStatus, 1)
                .set(CoupleInvitationDO::getAcceptedAt, acceptedAt)
                .set(CoupleInvitationDO::getUpdateTime, acceptedAt));
    }

    /**
     * 原子撤销邀请：只有待接受状态才能被撤销。
     */
    default int revoke(Long id, Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getId, id)
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .set(CoupleInvitationDO::getStatus, 2)
                .set(CoupleInvitationDO::getUpdateTime, updateTime));
    }

    /**
     * 撤销空间内所有待接受邀请。
     */
    default int revokePendingBySpaceId(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getStatus, 0)
                .set(CoupleInvitationDO::getStatus, 2)
                .set(CoupleInvitationDO::getUpdateTime, updateTime));
    }
}
