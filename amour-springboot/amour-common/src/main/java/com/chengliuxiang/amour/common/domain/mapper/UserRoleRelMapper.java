package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.UserRoleRelDO;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户角色关系 Mapper。
 */
public interface UserRoleRelMapper extends BaseMapper<UserRoleRelDO> {

    /**
     * 为用户分配启用的 common 角色；已存在有效关系时不重复插入。
     *
     * @return 实际插入的关系数，角色不存在时为 0
     */
    default List<String> selectRoleIds(String userId) {
        return selectList(new LambdaQueryWrapper<UserRoleRelDO>()
                .select(UserRoleRelDO::getRoleId)
                .eq(UserRoleRelDO::getUserId, userId)
                .eq(UserRoleRelDO::getIsDeleted, 0))
                .stream().map(UserRoleRelDO::getRoleId).collect(java.util.stream.Collectors.toList());
    }

    default int deleteByUserId(String userId) {
        return delete(new LambdaQueryWrapper<UserRoleRelDO>().eq(UserRoleRelDO::getUserId, userId));
    }

    default int insertRelation(String userId, String roleId) {
        UserRoleRelDO relation = new UserRoleRelDO();
        relation.setUserId(userId);
        relation.setRoleId(roleId);
        relation.setCreateTime(LocalDateTime.now());
        relation.setUpdateTime(LocalDateTime.now());
        relation.setIsDeleted(false);
        return insert(relation);
    }

    default int insertRelationIfAbsent(String userId, String roleId) {
        long existing = selectCount(new LambdaQueryWrapper<UserRoleRelDO>()
                .eq(UserRoleRelDO::getUserId, userId)
                .eq(UserRoleRelDO::getRoleId, roleId)
                .eq(UserRoleRelDO::getIsDeleted, 0));
        return existing > 0 ? 0 : insertRelation(userId, roleId);
    }

    default long countUsers(String roleId) {
        return selectCount(new LambdaQueryWrapper<UserRoleRelDO>()
                .eq(UserRoleRelDO::getRoleId, roleId)
                .eq(UserRoleRelDO::getIsDeleted, 0));
    }
}
