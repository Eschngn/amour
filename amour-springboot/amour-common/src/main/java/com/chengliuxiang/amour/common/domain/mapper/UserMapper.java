package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import java.util.Collection;
import java.util.List;

public interface UserMapper extends BaseMapper<UserDO> {

    default UserDO selectByUsername(String username) {
        return selectOne(new LambdaQueryWrapper<UserDO>()
                .eq(UserDO::getUsername, username));
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

    default List<UserDO> findUsersByIds(Collection<Long> ids) {
        return selectList(new LambdaQueryWrapper<UserDO>().in(UserDO::getId, ids));
    }
}
