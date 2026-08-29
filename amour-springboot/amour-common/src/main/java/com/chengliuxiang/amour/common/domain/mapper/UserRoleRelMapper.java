package com.chengliuxiang.amour.common.domain.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 用户角色关系 Mapper。
 */
@Mapper
public interface UserRoleRelMapper {

    /**
     * 为用户分配启用的 common 角色；已存在有效关系时不重复插入。
     *
     * @return 实际插入的关系数，角色不存在时为 0
     */
    @Insert("INSERT INTO `user_role_rel` (`user_id`, `role_id`, `create_time`, `update_time`, `is_deleted`) "
            + "SELECT #{userId}, r.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, b'0' "
            + "FROM `role` r "
            + "WHERE r.`role_key` = 'common' "
            + "  AND r.`status` = 0 "
            + "  AND r.`is_deleted` = b'0' "
            + "  AND NOT EXISTS ("
            + "      SELECT 1 FROM `user_role_rel` rel "
            + "      WHERE rel.`user_id` = #{userId} "
            + "        AND rel.`role_id` = r.id "
            + "        AND rel.`is_deleted` = b'0'"
            + "  )")
    int insertCommonRoleIfAbsent(@Param("userId") Long userId);

    /**
     * 查询用户当前有效的角色标识。
     */
    @Select("SELECT DISTINCT r.`role_key` "
            + "FROM `user_role_rel` rel "
            + "JOIN `role` r ON r.`id` = rel.`role_id` "
            + "WHERE rel.`user_id` = #{userId} "
            + "  AND rel.`is_deleted` = b'0' "
            + "  AND r.`status` = 0 "
            + "  AND r.`is_deleted` = b'0'")
    List<String> selectRoleKeys(@Param("userId") Long userId);

    /**
     * 查询用户通过角色获得的当前有效权限标识。
     */
    @Select("SELECT DISTINCT p.`permission_key` "
            + "FROM `user_role_rel` rel "
            + "JOIN `role` r ON r.`id` = rel.`role_id` "
            + "JOIN `role_permission_rel` role_rel ON role_rel.`role_id` = r.`id` "
            + "JOIN `permission` p ON p.`id` = role_rel.`permission_id` "
            + "WHERE rel.`user_id` = #{userId} "
            + "  AND rel.`is_deleted` = b'0' "
            + "  AND r.`status` = 0 "
            + "  AND r.`is_deleted` = b'0' "
            + "  AND role_rel.`is_deleted` = b'0' "
            + "  AND p.`status` = 0 "
            + "  AND p.`is_deleted` = b'0'")
    List<String> selectPermissionKeys(@Param("userId") Long userId);
}
