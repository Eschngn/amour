package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.RolePermissionRelDO;

import java.util.List;

public interface RolePermissionRelMapper extends BaseMapper<RolePermissionRelDO> {
    default List<String> selectPermissionIds(String roleId) {
        return selectList(new LambdaQueryWrapper<RolePermissionRelDO>()
                .select(RolePermissionRelDO::getPermissionId)
                .eq(RolePermissionRelDO::getRoleId, roleId)
                .eq(RolePermissionRelDO::getIsDeleted, 0))
                .stream().map(RolePermissionRelDO::getPermissionId).collect(java.util.stream.Collectors.toList());
    }

    default int deleteByRoleId(String roleId) {
        return delete(new LambdaQueryWrapper<RolePermissionRelDO>().eq(RolePermissionRelDO::getRoleId, roleId));
    }

    default long countRoles(String permissionId) {
        return selectCount(new LambdaQueryWrapper<RolePermissionRelDO>().eq(RolePermissionRelDO::getPermissionId, permissionId)
                .eq(RolePermissionRelDO::getIsDeleted, 0));
    }
}
