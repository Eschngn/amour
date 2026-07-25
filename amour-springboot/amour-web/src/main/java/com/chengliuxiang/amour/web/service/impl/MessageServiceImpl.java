package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chengliuxiang.amour.common.domain.dos.MessageDO;
import com.chengliuxiang.amour.common.domain.dos.MessageReplyDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.MessageMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageReplyMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.message.MessagePageItemVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePublishReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageReplyDeleteReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageReplyReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageReplyVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageDeleteReqVO;
import com.chengliuxiang.amour.web.service.MessageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MessageServiceImpl implements MessageService {

    @Resource
    private MessageMapper messageMapper;
    @Resource
    private MessageReplyMapper messageReplyMapper;
    @Resource
    private UserMapper userMapper;

    @Override
    public Response<PageResult<MessagePageItemVO>> pageMessages(MessagePageQueryReqVO reqVO) {
        Page<MessageDO> page = new Page<>(reqVO.getCurrent(), reqVO.getSize());
        LambdaQueryWrapper<MessageDO> wrapper = new LambdaQueryWrapper<MessageDO>()
                .eq(MessageDO::getIsDeleted, false)
                .orderByDesc(MessageDO::getCreateTime);
        IPage<MessageDO> messagePage = messageMapper.selectPage(page, wrapper);

        List<MessageDO> messages = messagePage.getRecords();
        if (CollUtil.isEmpty(messages)) {
            return Response.success(PageResult.<MessagePageItemVO>builder()
                    .current(reqVO.getCurrent())
                    .size(reqVO.getSize())
                    .total(0L)
                    .records(Collections.emptyList())
                    .build());
        }

        Object loginId = StpUtil.getLoginIdDefaultNull();
        String currentUserId = loginId == null ? null : String.valueOf(loginId);

        // 收集所有留言 ID
        List<String> messageIds = messages.stream()
                .map(MessageDO::getId)
                .collect(Collectors.toList());

        // 查询这些留言的所有回复，按创建时间升序
        List<MessageReplyDO> allReplies = messageReplyMapper.selectList(
                new LambdaQueryWrapper<MessageReplyDO>()
                        .in(MessageReplyDO::getMessageId, messageIds)
                        .eq(MessageReplyDO::getIsDeleted, false)
                        .orderByAsc(MessageReplyDO::getCreateTime));

        Map<String, List<MessageReplyDO>> replyMap = allReplies.stream()
                .collect(Collectors.groupingBy(MessageReplyDO::getMessageId));

        // 收集所有涉及的用户 ID
        Set<Long> userIds = new HashSet<>();
        for (MessageDO m : messages) {
            addUserId(userIds, m.getUserId());
        }
        for (MessageReplyDO r : allReplies) {
            addUserId(userIds, r.getFromUserId());
            addUserId(userIds, r.getToUserId());
        }

        // 查询用户，展示资料与登录 username 分离，留言板不会暴露登录名。
        Map<Long, UserDO> userMap;
        if (CollUtil.isNotEmpty(userIds)) {
            List<UserDO> users = userMapper.selectList(
                    new LambdaQueryWrapper<UserDO>().in(UserDO::getId, userIds));
            userMap = users.stream()
                    .collect(Collectors.toMap(UserDO::getId, user -> user));
        } else {
            userMap = Collections.emptyMap();
        }

        // 组装返回结果
        List<MessagePageItemVO> records = messages.stream()
                .map(m -> {
                    List<MessageReplyDO> replies = replyMap.getOrDefault(m.getId(), Collections.emptyList());
                    return MessagePageItemVO.builder()
                            .messageId(m.getId())
                            .content(m.getContent())
                            .userName(getDisplayName(userMap, m.getUserId()))
                            .userAvatar(getAvatar(userMap, m.getUserId()))
                            .canDelete(StrUtil.equals(currentUserId, StrUtil.trim(m.getUserId())))
                            .createTime(m.getCreateTime())
                            .updateTime(m.getUpdateTime())
                            .replies(replies.stream()
                                    .map(r -> MessageReplyVO.builder()
                                            .replyId(r.getId())
                                            .content(r.getContent())
                                            .fromUserName(getDisplayName(userMap, r.getFromUserId()))
                                            .fromUserAvatar(getAvatar(userMap, r.getFromUserId()))
                                            .toUserName(getDisplayName(userMap, r.getToUserId()))
                                            .canDelete(StrUtil.equals(currentUserId, StrUtil.trim(r.getFromUserId())))
                                            .createTime(r.getCreateTime())
                                            .build())
                                    .collect(Collectors.toList()))
                            .build();
                })
                .collect(Collectors.toList());

        return Response.success(PageResult.<MessagePageItemVO>builder()
                .current(messagePage.getCurrent())
                .size(messagePage.getSize())
                .total(messagePage.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<Void> publishMessage(MessagePublishReqVO reqVO) {
        LocalDateTime now = LocalDateTime.now();
        MessageDO message = MessageDO.builder()
                .userId(String.valueOf(StpUtil.getLoginIdAsLong()))
                .content(reqVO.getContent())
                .createTime(now)
                .updateTime(now)
                .isDeleted(false)
                .build();
        messageMapper.insert(message);
        return Response.success();
    }

    @Override
    public Response<Void> replyMessage(MessageReplyReqVO reqVO) {
        MessageDO message = messageMapper.selectById(reqVO.getMessageId().trim());
        if (message == null || Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        String toUserId = message.getUserId();
        String parentReplyId = null;
        if (StrUtil.isNotBlank(reqVO.getReplyId())) {
            MessageReplyDO targetReply = messageReplyMapper.selectById(reqVO.getReplyId().trim());
            if (targetReply == null
                    || Boolean.TRUE.equals(targetReply.getIsDeleted())
                    || !message.getId().equals(targetReply.getMessageId())) {
                throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
            }
            toUserId = targetReply.getFromUserId();
            parentReplyId = targetReply.getId();
        }

        MessageReplyDO reply = MessageReplyDO.builder()
                .messageId(message.getId())
                .parentReplyId(parentReplyId)
                .fromUserId(String.valueOf(StpUtil.getLoginIdAsLong()))
                .toUserId(toUserId)
                .content(reqVO.getContent().trim())
                .createTime(LocalDateTime.now())
                .isDeleted(false)
                .build();
        messageReplyMapper.insert(reply);
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteMessage(MessageDeleteReqVO reqVO) {
        String messageId = reqVO.getMessageId().trim();
        MessageDO message = messageMapper.selectById(messageId);
        if (message == null || Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        String currentUserId = String.valueOf(StpUtil.getLoginIdAsLong());
        if (!Objects.equals(currentUserId, message.getUserId())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_DELETE_FORBIDDEN);
        }

        int updatedRows = messageMapper.update(null,
                new LambdaUpdateWrapper<MessageDO>()
                        .eq(MessageDO::getId, messageId)
                        .eq(MessageDO::getUserId, currentUserId)
                        .eq(MessageDO::getIsDeleted, false)
                        .set(MessageDO::getIsDeleted, true)
                        .set(MessageDO::getUpdateTime, LocalDateTime.now()));
        if (updatedRows == 0) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        messageReplyMapper.update(null,
                new LambdaUpdateWrapper<MessageReplyDO>()
                        .eq(MessageReplyDO::getMessageId, messageId)
                        .eq(MessageReplyDO::getIsDeleted, false)
                        .set(MessageReplyDO::getIsDeleted, true));
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteReply(MessageReplyDeleteReqVO reqVO) {
        String replyId = reqVO.getReplyId().trim();
        MessageReplyDO reply = messageReplyMapper.selectById(replyId);
        if (reply == null || Boolean.TRUE.equals(reply.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
        }

        MessageDO message = messageMapper.selectById(reply.getMessageId());
        if (message == null || Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
        }

        String currentUserId = String.valueOf(StpUtil.getLoginIdAsLong());
        if (!StrUtil.equals(currentUserId, StrUtil.trim(reply.getFromUserId()))) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_DELETE_FORBIDDEN);
        }

        Set<String> replyIds = collectReplyTreeIds(replyId);
        int updatedRows = messageReplyMapper.update(null,
                new LambdaUpdateWrapper<MessageReplyDO>()
                        .in(MessageReplyDO::getId, replyIds)
                        .eq(MessageReplyDO::getIsDeleted, false)
                        .set(MessageReplyDO::getIsDeleted, true));
        if (updatedRows == 0) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
        }
        return Response.success();
    }

    private Set<String> collectReplyTreeIds(String rootReplyId) {
        Set<String> replyIds = new HashSet<>();
        replyIds.add(rootReplyId);

        Set<String> parentIds = Collections.singleton(rootReplyId);
        while (CollUtil.isNotEmpty(parentIds)) {
            List<MessageReplyDO> children = messageReplyMapper.selectList(
                    new LambdaQueryWrapper<MessageReplyDO>()
                            .select(MessageReplyDO::getId)
                            .in(MessageReplyDO::getParentReplyId, parentIds)
                            .eq(MessageReplyDO::getIsDeleted, false));
            Set<String> childIds = children.stream()
                    .map(MessageReplyDO::getId)
                    .filter(StrUtil::isNotBlank)
                    .filter(replyIds::add)
                    .collect(Collectors.toSet());
            parentIds = childIds;
        }
        return replyIds;
    }

    private void addUserId(Set<Long> userIds, String userIdStr) {
        if (StrUtil.isNotBlank(userIdStr)) {
            try {
                userIds.add(Long.valueOf(userIdStr));
            } catch (NumberFormatException ignored) {
            }
        }
    }

    private UserDO getUser(Map<Long, UserDO> userMap, String userIdStr) {
        if (StrUtil.isBlank(userIdStr)) {
            return null;
        }
        try {
            return userMap.get(Long.valueOf(userIdStr));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String getDisplayName(Map<Long, UserDO> userMap, String userIdStr) {
        UserDO user = getUser(userMap, userIdStr);
        return user == null ? "匿名" : StrUtil.blankToDefault(user.getDisplayName(), "恋人");
    }

    private String getAvatar(Map<Long, UserDO> userMap, String userIdStr) {
        UserDO user = getUser(userMap, userIdStr);
        return user == null ? "" : StrUtil.blankToDefault(user.getAvatar(), "");
    }
}
