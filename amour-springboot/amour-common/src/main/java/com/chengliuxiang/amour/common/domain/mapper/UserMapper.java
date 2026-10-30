package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import java.util.Collection;
import java.util.List;

public interface UserMapper extends BaseMapper<UserDO> {

    default IPage<UserDO> selectAdminPage(long current, long size, String keyword, Integer status) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<UserDO>()
                .eq(status != null && status == 0, UserDO::getIsDeleted, false)
                .eq(status != null && status == 1, UserDO::getIsDeleted, true)
                .and(org.apache.commons.lang3.StringUtils.isNotBlank(keyword), w -> w
                        .like(UserDO::getUsername, keyword).or().like(UserDO::getDisplayName, keyword))
                .orderByDesc(UserDO::getId));
    }

    default UserDO selectByUsername(String username) {
        return selectOne(new LambdaQueryWrapper<UserDO>()
                .eq(UserDO::getUsername, username)
                .eq(UserDO::getIsDeleted, false));
    }

    default UserDO selectAnyByUsername(String username) {
        return selectOne(new LambdaQueryWrapper<UserDO>().eq(UserDO::getUsername, username));
    }

    default UserDO selectByWechatOpenid(String openid) {
        return selectOne(new LambdaQueryWrapper<UserDO>()
                .eq(UserDO::getWechatOpenid, openid));
    }

    default UserDO findById(Long id) {
        return selectById(id);
    }

    default int save(UserDO user) {
        return user.getId() == null ? insert(user) : updateById(user);
    }

    default UserDO selectActiveById(Long id) {
        return selectOne(new LambdaQueryWrapper<UserDO>()
                .eq(UserDO::getId, id)
                .eq(UserDO::getIsDeleted, false));
    }

    default UserDO selectAdminById(Long id) {
        return selectOne(new LambdaQueryWrapper<UserDO>().eq(UserDO::getId, id));
    }

    default List<UserDO> findUsersByIds(Collection<Long> ids) {
        return selectList(new LambdaQueryWrapper<UserDO>().in(UserDO::getId, ids));
    }
}
