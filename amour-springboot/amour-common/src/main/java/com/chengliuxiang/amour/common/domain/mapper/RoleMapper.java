package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.RoleDO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface RoleMapper extends BaseMapper<RoleDO> {
    default IPage<RoleDO> selectRolePage(long current, long size, String keyword) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<RoleDO>()
                .eq(RoleDO::getIsDeleted, false)
                .and(org.apache.commons.lang3.StringUtils.isNotBlank(keyword), w -> w
                        .like(RoleDO::getRoleName, keyword)
                        .or().like(RoleDO::getRoleKey, keyword)
                        .or().like(RoleDO::getRemark, keyword))
                .orderByAsc(RoleDO::getSort).orderByDesc(RoleDO::getId));
    }

    default RoleDO selectActiveById(Long id) {
        return selectOne(new LambdaQueryWrapper<RoleDO>().eq(RoleDO::getId, id).eq(RoleDO::getIsDeleted, false));
    }

    default RoleDO selectByRoleKey(String roleKey, Long excludedId) {
        return selectOne(new LambdaQueryWrapper<RoleDO>().eq(RoleDO::getRoleKey, roleKey)
                .ne(excludedId != null, RoleDO::getId, excludedId));
    }

    default List<RoleDO> selectActiveList() {
        return selectList(new LambdaQueryWrapper<RoleDO>().eq(RoleDO::getIsDeleted, false)
                .orderByAsc(RoleDO::getSort).orderByDesc(RoleDO::getId));
    }
}
