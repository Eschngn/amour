package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.PermissionDO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface PermissionMapper extends BaseMapper<PermissionDO> {
    default List<PermissionDO> selectActiveList() {
        return selectList(new LambdaQueryWrapper<PermissionDO>().eq(PermissionDO::getStatus, 0)
                .eq(PermissionDO::getIsDeleted, false).orderByAsc(PermissionDO::getSort).orderByAsc(PermissionDO::getId));
    }

    default PermissionDO selectActiveById(Long id) {
        return selectOne(new LambdaQueryWrapper<PermissionDO>().eq(PermissionDO::getId, id)
                .eq(PermissionDO::getIsDeleted, false));
    }

    default PermissionDO selectByKey(String key, Long excludedId) {
        return selectOne(new LambdaQueryWrapper<PermissionDO>().eq(PermissionDO::getPermissionKey, key)
                .ne(excludedId != null, PermissionDO::getId, excludedId));
    }

    default long countChildren(Long parentId) {
        return selectCount(new LambdaQueryWrapper<PermissionDO>().eq(PermissionDO::getParentId, parentId)
                .eq(PermissionDO::getIsDeleted, false));
    }
}
