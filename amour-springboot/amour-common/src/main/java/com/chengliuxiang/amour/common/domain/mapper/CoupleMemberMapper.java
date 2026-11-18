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

    /**
     * 批量查询多个用户的有效成员关系（不限空间状态），供后台人工恢复前检测冲突空间。
     * 调用方仍需自行排除原空间与 status=5 的历史残留。
     */
    default List<CoupleMemberDO> selectActiveByUserIds(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .in(CoupleMemberDO::getUserId, userIds)
                .eq(CoupleMemberDO::getStatus, 1)
                .orderByAsc(CoupleMemberDO::getSpaceId)
                .orderByAsc(CoupleMemberDO::getId));
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
     * 查询用户在「未解绑且未销毁空间」中的有效成员关系。
     *
     * <p>status=5（已解绑）与 status=6（已销毁）的历史残留都会被排除：
     * 这两种空间对普通用户都不再是「我的情侣空间」，业务判断一律使用本方法，
     * 而不是 {@link #countActiveByUserId(Long)}。</p>
     */
    default List<CoupleMemberDO> selectActiveInLiveSpaces(Long userId) {
        return selectList(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getUserId, userId)
                .eq(CoupleMemberDO::getStatus, 1)
                .apply("space_id IN (SELECT id FROM couple_space WHERE status NOT IN (5, 6))")
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

    /**
     * 后台人工恢复时安全关闭冲突空间：只把指定用户在该空间的有效成员关系标记为退出。
     * 条件更新保证只有「仍然有效」的关系被改写，返回受影响行数供调用方校验并回滚。
     */
    default int leaveActiveMembership(Long spaceId, Long userId, Integer status,
                                     LocalDateTime leftAt, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getUserId, userId)
                .eq(CoupleMemberDO::getStatus, 1)
                .set(CoupleMemberDO::getStatus, status)
                .set(CoupleMemberDO::getLeftAt, leftAt)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }

    /**
     * 销毁空间：把空间内全部有效成员一次性标记为已退出，并写入退出时间。
     *
     * <p>销毁后成员不再能以任何身份访问该空间；成员关系行本身保留（不物理删除），
     * 管理员从留档恢复时按快照重新激活。条件更新同时校验空间维度，返回受影响行数供调用方断言。</p>
     */
    default int leaveAllActiveForDestroy(Long spaceId, Integer status,
                                         LocalDateTime leftAt, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getStatus, 1)
                .set(CoupleMemberDO::getStatus, status)
                .set(CoupleMemberDO::getLeftAt, leftAt)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }

    /**
     * 从销毁留档恢复：把该空间内全部已退出成员重新激活，并按快照恢复角色与加入时间。
     *
     * <p>返回受影响行数，调用方必须校验与快照中的成员数量一致，否则回滚整笔恢复事务。</p>
     */
    default int restoreLeftForArchive(Long spaceId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getStatus, 3)
                .set(CoupleMemberDO::getStatus, 1)
                .set(CoupleMemberDO::getLeftAt, null)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }

    /**
     * 恢复单个成员关系为有效，并写回快照中的角色 / 加入时间 / 退出时间（退出时间为空）。
     *
     * <p>条件更新只允许从「已退出」恢复，避免覆盖并发新增的有效成员关系。</p>
     */
    default int restoreMemberFromArchive(Long spaceId, Long userId, Integer memberRole,
                                         LocalDateTime joinedAt, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getSpaceId, spaceId)
                .eq(CoupleMemberDO::getUserId, userId)
                .eq(CoupleMemberDO::getStatus, 3)
                .set(CoupleMemberDO::getStatus, 1)
                .set(memberRole != null, CoupleMemberDO::getMemberRole, memberRole)
                .set(joinedAt != null, CoupleMemberDO::getJoinedAt, joinedAt)
                .set(CoupleMemberDO::getLeftAt, null)
                .set(CoupleMemberDO::getUpdateTime, updateTime));
    }

    /**
     * 统计用户在指定空间状态的成员关系数量（不限成员自身状态）。
     *
     * <p>用于把「空间已解绑（status=5）」与「空间已销毁（status=6）」区分成不同的稳定错误，
     * 避免统一返回「空间不存在」造成前端无法给出可理解提示。</p>
     */
    default Long countMembershipInSpaceStatus(Long userId, int spaceStatus) {
        return selectCount(new LambdaQueryWrapper<CoupleMemberDO>()
                .eq(CoupleMemberDO::getUserId, userId)
                .apply("space_id IN (SELECT id FROM couple_space WHERE status = {0})", spaceStatus));
    }

}
