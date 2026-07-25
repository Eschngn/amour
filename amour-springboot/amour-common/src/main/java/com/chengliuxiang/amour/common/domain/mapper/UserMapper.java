package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.UserDO;

public interface UserMapper extends BaseMapper<UserDO> {

    default UserDO selectByUsername(String username) {
        return selectOne(new LambdaQueryWrapper<UserDO>()
                .eq(UserDO::getUsername, username));
    }
}
