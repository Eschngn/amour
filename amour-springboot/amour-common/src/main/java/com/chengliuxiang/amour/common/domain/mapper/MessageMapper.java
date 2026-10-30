package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.MessageDO;
import java.time.LocalDateTime;

public interface MessageMapper extends BaseMapper<MessageDO> {

    default int insertMessage(MessageDO message) {
        return insert(message);
    }

    default MessageDO findById(String id) {
        return selectById(id);
    }

    default IPage<MessageDO> selectVisiblePage(long current, long size) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<MessageDO>()
                .eq(MessageDO::getIsDeleted, false)
                .orderByDesc(MessageDO::getCreateTime));
    }

    default IPage<MessageDO> selectAdminPage(long current, long size, String content) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<MessageDO>()
                .like(cn.hutool.core.util.StrUtil.isNotBlank(content), MessageDO::getContent, content)
                .eq(MessageDO::getIsDeleted, false)
                .orderByDesc(MessageDO::getCreateTime));
    }

    default int softDelete(String messageId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<MessageDO>()
                .eq(MessageDO::getId, messageId)
                .eq(MessageDO::getIsDeleted, false)
                .set(MessageDO::getIsDeleted, true)
                .set(MessageDO::getUpdateTime, updateTime));
    }

    default int softDeleteOwned(String messageId, String userId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<MessageDO>()
                .eq(MessageDO::getId, messageId).eq(MessageDO::getUserId, userId)
                .eq(MessageDO::getIsDeleted, false).set(MessageDO::getIsDeleted, true)
                .set(MessageDO::getUpdateTime, updateTime));
    }
}
