package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.MessageReplyDO;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface MessageReplyMapper extends BaseMapper<MessageReplyDO> {

    default int insertReply(MessageReplyDO reply) {
        return insert(reply);
    }

    default MessageReplyDO findById(Long spaceId, Long id) {
        return selectOne(new LambdaQueryWrapper<MessageReplyDO>()
                .eq(MessageReplyDO::getSpaceId, spaceId)
                .eq(MessageReplyDO::getId, id));
    }

    default List<MessageReplyDO> selectVisibleByMessageIds(Long spaceId, Collection<Long> messageIds) {
        return selectList(new LambdaQueryWrapper<MessageReplyDO>()
                .eq(MessageReplyDO::getSpaceId, spaceId)
                .in(MessageReplyDO::getMessageId, messageIds)
                .eq(MessageReplyDO::getIsDeleted, false)
                .orderByAsc(MessageReplyDO::getCreateTime));
    }

    default List<MessageReplyDO> selectActiveByMessageIds(Long spaceId, Collection<Long> messageIds) {
        return selectList(new LambdaQueryWrapper<MessageReplyDO>()
                .eq(MessageReplyDO::getSpaceId, spaceId)
                .in(MessageReplyDO::getMessageId, messageIds)
                .eq(MessageReplyDO::getIsDeleted, false));
    }

    default List<MessageReplyDO> selectActiveBySpaceId(Long spaceId) {
        return selectList(new LambdaQueryWrapper<MessageReplyDO>()
                .eq(MessageReplyDO::getSpaceId, spaceId)
                .eq(MessageReplyDO::getIsDeleted, false)
                .orderByAsc(MessageReplyDO::getCreateTime));
    }

    default int softDeleteByMessageId(Long spaceId, Long messageId, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<MessageReplyDO>()
                .eq(MessageReplyDO::getSpaceId, spaceId)
                .eq(MessageReplyDO::getMessageId, messageId)
                .eq(MessageReplyDO::getIsDeleted, false)
                .set(MessageReplyDO::getIsDeleted, true)
                .set(MessageReplyDO::getUpdateTime, updateTime));
    }

    default List<MessageReplyDO> selectActiveChildren(Long spaceId, Collection<Long> parentIds) {
        return selectList(new LambdaQueryWrapper<MessageReplyDO>().select(MessageReplyDO::getId)
                .eq(MessageReplyDO::getSpaceId, spaceId)
                .in(MessageReplyDO::getParentReplyId, parentIds)
                .eq(MessageReplyDO::getIsDeleted, false));
    }

    default int softDeleteByIds(Long spaceId, Collection<Long> ids, LocalDateTime updateTime) {
        return update(null, new LambdaUpdateWrapper<MessageReplyDO>()
                .eq(MessageReplyDO::getSpaceId, spaceId)
                .in(MessageReplyDO::getId, ids)
                .eq(MessageReplyDO::getIsDeleted, false)
                .set(MessageReplyDO::getIsDeleted, true)
                .set(MessageReplyDO::getUpdateTime, updateTime));
    }

    default java.util.Set<Long> collectReplyTreeIds(Long spaceId, Long rootReplyId) {
        java.util.Set<Long> replyIds = new java.util.HashSet<>();
        replyIds.add(rootReplyId);
        java.util.Set<Long> parentIds = java.util.Collections.singleton(rootReplyId);
        while (!parentIds.isEmpty()) {
            List<MessageReplyDO> children = selectActiveChildren(spaceId, parentIds);
            java.util.Set<Long> childIds = new java.util.HashSet<>();
            for (MessageReplyDO child : children) {
                if (child.getId() != null && replyIds.add(child.getId())) {
                    childIds.add(child.getId());
                }
            }
            parentIds = childIds;
        }
        return replyIds;
    }
}
