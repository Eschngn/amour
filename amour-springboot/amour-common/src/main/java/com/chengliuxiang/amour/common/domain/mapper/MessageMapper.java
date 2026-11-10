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

    default MessageDO findById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<MessageDO>()
                .eq(MessageDO::getSpaceId, spaceId)
                .eq(MessageDO::getId, id));
    }

    default IPage<MessageDO> selectSpacePage(long current, long size, Long spaceId) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<MessageDO>()
                .eq(MessageDO::getSpaceId, spaceId)
                .eq(MessageDO::getIsDeleted, false)
                .orderByDesc(MessageDO::getCreateTime));
    }

    default IPage<MessageDO> selectAdminPage(long current, long size, Long spaceId, String content) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<MessageDO>()
                .eq(spaceId != null, MessageDO::getSpaceId, spaceId)
                .like(cn.hutool.core.util.StrUtil.isNotBlank(content), MessageDO::getContent, content)
                .eq(MessageDO::getIsDeleted, false)
                .orderByDesc(MessageDO::getCreateTime));
    }

    /**
     * 后台治理分页：显式空间过滤、可查看逻辑删除。
     */
    default IPage<MessageDO> selectAdminGovernancePage(long current, long size, Long spaceId,
                                                       String keyword, boolean includeDeleted) {
        return selectPage(new Page<>(current, size), new LambdaQueryWrapper<MessageDO>()
                .eq(spaceId != null, MessageDO::getSpaceId, spaceId)
                .eq(!includeDeleted, MessageDO::getIsDeleted, false)
                .like(cn.hutool.core.util.StrUtil.isNotBlank(keyword), MessageDO::getContent,
                        cn.hutool.core.util.StrUtil.trim(keyword))
                .orderByDesc(MessageDO::getUpdateTime)
                .orderByDesc(MessageDO::getId));
    }

    default int softDeleteAsAdmin(Long spaceId, Long messageId, Long updatedBy, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<MessageDO>()
                .eq(MessageDO::getSpaceId, spaceId)
                .eq(MessageDO::getId, messageId)
                .eq(MessageDO::getIsDeleted, false)
                .set(MessageDO::getIsDeleted, true)
                .set(MessageDO::getUpdateTime, updateTime));
    }

    default int softDelete(Long spaceId, Long messageId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<MessageDO>()
                .eq(MessageDO::getSpaceId, spaceId)
                .eq(MessageDO::getId, messageId)
                .eq(MessageDO::getIsDeleted, false)
                .set(MessageDO::getIsDeleted, true)
                .set(MessageDO::getUpdateTime, updateTime));
    }

    default int softDeleteOwned(Long spaceId, Long messageId, Long userId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<MessageDO>()
                .eq(MessageDO::getSpaceId, spaceId)
                .eq(MessageDO::getId, messageId).eq(MessageDO::getUserId, userId)
                .eq(MessageDO::getIsDeleted, false).set(MessageDO::getIsDeleted, true)
                .set(MessageDO::getUpdateTime, updateTime));
    }

    default Long countActiveBySpaceId(Long spaceId) {
        return selectCount(new LambdaQueryWrapper<MessageDO>()
                .eq(MessageDO::getSpaceId, spaceId)
                .eq(MessageDO::getIsDeleted, false));
    }
}
