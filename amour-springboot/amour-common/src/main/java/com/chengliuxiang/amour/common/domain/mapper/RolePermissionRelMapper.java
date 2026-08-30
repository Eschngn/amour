package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.RolePermissionRelDO;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface RolePermissionRelMapper extends BaseMapper<RolePermissionRelDO> {
    @Select("SELECT permission_id FROM role_permission_rel WHERE role_id = #{roleId} AND is_deleted = b'0'")
    List<Long> selectPermissionIds(@Param("roleId") Long roleId);

    @Delete("DELETE FROM role_permission_rel WHERE role_id = #{roleId}")
    int deleteByRoleId(@Param("roleId") Long roleId);

    @Select("SELECT COUNT(1) FROM user_role_rel WHERE role_id = #{roleId} AND is_deleted = b'0'")
    long countUsers(@Param("roleId") Long roleId);

    @Select("SELECT COUNT(1) FROM role_permission_rel WHERE permission_id = #{permissionId} AND is_deleted = b'0'")
    long countRoles(@Param("permissionId") Long permissionId);
}
