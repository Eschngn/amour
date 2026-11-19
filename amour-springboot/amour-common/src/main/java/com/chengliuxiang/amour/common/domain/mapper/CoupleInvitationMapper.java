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
     * 后台空间详情：返回该空间全部邀请记录（含已接受/撤销/过期），不返回 token。
     */
    default List<CoupleInvitationDO> selectBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
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

    /**
     * 统计空间内「曾被接受过」的邀请数量（status=1 已接受且有接受时间）。
     *
     * <p>销毁只允许发生在「另一半从未加入」的单人空间。成员行是最直接的证据，
     * 但历史数据可能存在成员行被清理、只留下已接受邀请的情况；此时邀请接受记录
     * 同样证明「曾经有另一半加入过」，销毁必须保守拒绝，而不是当成从未加入。</p>
     */
    default Long countAcceptedBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<CoupleInvitationDO>()
                .eq(CoupleInvitationDO::getSpaceId, spaceId)
                .eq(CoupleInvitationDO::getStatus, 1)
                .isNotNull(CoupleInvitationDO::getAcceptedAt));
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
