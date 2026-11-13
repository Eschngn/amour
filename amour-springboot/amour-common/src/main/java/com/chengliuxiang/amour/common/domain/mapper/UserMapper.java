package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import java.util.Collection;
import java.util.List;

public interface UserMapper extends BaseMapper<UserDO> {

    /**
     * 对用户行加数据库写锁，用于跨实例串行化「创建空间 / 接受邀请 / 人工恢复」。
     *
     * <p>SQLite 不支持 {@code SELECT ... FOR UPDATE}，这里用同值 UPDATE 获得行级写锁：
     * MySQL 下会锁住该用户行，SQLite 下会锁住写事务。语句不改动任何业务字段。
     * 调用方必须按用户 ID 升序加锁，避免多实例互相等待。</p>
     */
    default void lockById(Long userId) {
        if (userId == null) {
            return;
        }
        update(null, new UpdateWrapper<UserDO>()
                .eq("id", userId)
                .setSql("update_time = update_time"));
    }

    default IPage<UserDO> selectAdminPage(long current, long size, String keyword, Integer status) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<UserDO>()
                .eq(status != null && status == 0, UserDO::getIsDeleted, false)
                .eq(status != null && status == 1, UserDO::getIsDeleted, true)
                .and(org.apache.commons.lang3.StringUtils.isNotBlank(keyword), w -> w
                        .like(UserDO::getUsername, keyword)
                        .or().like(UserDO::getDisplayName, keyword)
                        .or().like(UserDO::getAmourId, keyword))
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

    default UserDO selectByAmourId(String amourId) {
        return selectOne(new LambdaQueryWrapper<UserDO>()
                .eq(UserDO::getAmourId, amourId)
                .eq(UserDO::getIsDeleted, false));
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

    default List<UserDO> selectActiveAdmins() {
        return selectList(new LambdaQueryWrapper<UserDO>()
                .eq(UserDO::getIsDeleted, false)
                .eq(UserDO::getIsPlatformAdmin, true)
                .orderByAsc(UserDO::getId));
    }
}
