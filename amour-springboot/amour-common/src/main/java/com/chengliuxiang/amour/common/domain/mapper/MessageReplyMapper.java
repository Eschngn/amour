package com.chengliuxiang.amour.common.domain.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chengliuxiang.amour.common.domain.dos.MessageReplyDO;
import java.util.Collection;
import java.util.List;

public interface MessageReplyMapper extends BaseMapper<MessageReplyDO> {

    default int insertReply(MessageReplyDO reply) {
        return insert(reply);
    }

    default MessageReplyDO findById(String id) {
        return selectById(id);
    }

    default List<MessageReplyDO> selectVisibleByMessageIds(Collection<String> messageIds) {
        return selectList(new LambdaQueryWrapper<MessageReplyDO>()
                .in(MessageReplyDO::getMessageId, messageIds).eq(MessageReplyDO::getIsDeleted, false)
                .orderByAsc(MessageReplyDO::getCreateTime));
    }

    default List<MessageReplyDO> selectActiveByMessageIds(Collection<String> messageIds) {
        return selectList(new LambdaQueryWrapper<MessageReplyDO>()
                .in(MessageReplyDO::getMessageId, messageIds)
                .eq(MessageReplyDO::getIsDeleted, false));
    }

    default int softDeleteByMessageId(String messageId) {
        return update(null, new LambdaUpdateWrapper<MessageReplyDO>()
                .eq(MessageReplyDO::getMessageId, messageId).eq(MessageReplyDO::getIsDeleted, false)
                .set(MessageReplyDO::getIsDeleted, true));
    }

    default List<MessageReplyDO> selectActiveChildren(Collection<String> parentIds) {
        return selectList(new LambdaQueryWrapper<MessageReplyDO>().select(MessageReplyDO::getId)
                .in(MessageReplyDO::getParentReplyId, parentIds).eq(MessageReplyDO::getIsDeleted, false));
    }

    default int softDeleteByIds(Collection<String> ids) {
        return update(null, new LambdaUpdateWrapper<MessageReplyDO>().in(MessageReplyDO::getId, ids)
                .eq(MessageReplyDO::getIsDeleted, false).set(MessageReplyDO::getIsDeleted, true));
    }

    default java.util.Set<String> collectReplyTreeIds(String rootReplyId) {
        java.util.Set<String> replyIds = new java.util.HashSet<>();
        replyIds.add(rootReplyId);
        java.util.Set<String> parentIds = java.util.Collections.singleton(rootReplyId);
        while (!parentIds.isEmpty()) {
            List<MessageReplyDO> children = selectActiveChildren(parentIds);
            java.util.Set<String> childIds = new java.util.HashSet<>();
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
