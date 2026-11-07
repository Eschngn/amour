package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.domain.dos.CoupleMemberDO;
import com.chengliuxiang.amour.common.domain.dos.MessageDO;
import com.chengliuxiang.amour.common.domain.dos.MessageReplyDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.CoupleMemberMapper;
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
    @Resource
    private CoupleMemberMapper coupleMemberMapper;

    @Override
    public Response<PageResult<MessagePageItemVO>> pageMessages(MessagePageQueryReqVO reqVO) {
        Long spaceId = requireCurrentSpaceId();
        com.baomidou.mybatisplus.core.metadata.IPage<MessageDO> messagePage = messageMapper.selectSpacePage(
                reqVO.getCurrent(), reqVO.getSize(), spaceId);

        List<MessageDO> messages = messagePage.getRecords();
        if (CollUtil.isEmpty(messages)) {
            return Response.success(PageResult.<MessagePageItemVO>builder()
                    .current(reqVO.getCurrent())
                    .size(reqVO.getSize())
                    .total(0L)
                    .records(Collections.emptyList())
                    .build());
        }

        Long currentUserId = StpUtil.getLoginIdAsLong();

        // 收集所有留言 ID
        List<Long> messageIds = messages.stream()
                .map(MessageDO::getId)
                .collect(Collectors.toList());

        // 查询这些留言的所有回复，按创建时间升序
        List<MessageReplyDO> allReplies = messageReplyMapper.selectVisibleByMessageIds(spaceId, messageIds);

        Map<Long, List<MessageReplyDO>> replyMap = allReplies.stream()
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
            List<UserDO> users = userMapper.findUsersByIds(userIds);
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
                            .messageId(String.valueOf(m.getId()))
                            .content(m.getContent())
                            .userName(getDisplayName(userMap, m.getUserId()))
                            .userAvatar(getAvatar(userMap, m.getUserId()))
                            .canDelete(Objects.equals(currentUserId, m.getUserId()))
                            .createTime(m.getCreateTime())
                            .updateTime(m.getUpdateTime())
                            .replies(replies.stream()
                                    .map(r -> MessageReplyVO.builder()
                                            .replyId(String.valueOf(r.getId()))
                                            .content(r.getContent())
                                            .fromUserName(getDisplayName(userMap, r.getFromUserId()))
                                            .fromUserAvatar(getAvatar(userMap, r.getFromUserId()))
                                            .toUserName(getDisplayName(userMap, r.getToUserId()))
                                            .canDelete(Objects.equals(currentUserId, r.getFromUserId()))
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
        Long spaceId = requireCurrentSpaceId();
        LocalDateTime now = LocalDateTime.now();
        MessageDO message = MessageDO.builder()
                .spaceId(spaceId)
                .userId(StpUtil.getLoginIdAsLong())
                .content(reqVO.getContent())
                .createTime(now)
                .updateTime(now)
                .isDeleted(false)
                .build();
        messageMapper.insertMessage(message);
        return Response.success();
    }

    @Override
    public Response<Void> replyMessage(MessageReplyReqVO reqVO) {
        Long spaceId = requireCurrentSpaceId();
        Long messageId = parseId(reqVO.getMessageId(), ResponseCodeEnum.MESSAGE_NOT_EXIST);
        MessageDO message = messageMapper.findById(spaceId, messageId);
        if (message == null || Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        Long toUserId = message.getUserId();
        Long parentReplyId = null;
        if (StrUtil.isNotBlank(reqVO.getReplyId())) {
            Long replyId = parseId(reqVO.getReplyId(), ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
            MessageReplyDO targetReply = messageReplyMapper.findById(spaceId, replyId);
            if (targetReply == null
                    || Boolean.TRUE.equals(targetReply.getIsDeleted())
                    || !Objects.equals(message.getId(), targetReply.getMessageId())) {
                throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
            }
            toUserId = targetReply.getFromUserId();
            parentReplyId = targetReply.getId();
        }

        MessageReplyDO reply = MessageReplyDO.builder()
                .spaceId(spaceId)
                .messageId(message.getId())
                .parentReplyId(parentReplyId)
                .fromUserId(StpUtil.getLoginIdAsLong())
                .toUserId(toUserId)
                .content(reqVO.getContent().trim())
                .createTime(LocalDateTime.now())
                .isDeleted(false)
                .build();
        messageReplyMapper.insertReply(reply);
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteMessage(MessageDeleteReqVO reqVO) {
        Long spaceId = requireCurrentSpaceId();
        Long messageId = parseId(reqVO.getMessageId(), ResponseCodeEnum.MESSAGE_NOT_EXIST);
        MessageDO message = messageMapper.findById(spaceId, messageId);
        if (message == null || Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        Long currentUserId = StpUtil.getLoginIdAsLong();
        if (!Objects.equals(currentUserId, message.getUserId())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_DELETE_FORBIDDEN);
        }

        int updatedRows = messageMapper.softDeleteOwned(spaceId, messageId, currentUserId, LocalDateTime.now());
        if (updatedRows == 0) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        messageReplyMapper.softDeleteByMessageId(spaceId, messageId, LocalDateTime.now());
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteReply(MessageReplyDeleteReqVO reqVO) {
        Long spaceId = requireCurrentSpaceId();
        Long replyId = parseId(reqVO.getReplyId(), ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
        MessageReplyDO reply = messageReplyMapper.findById(spaceId, replyId);
        if (reply == null || Boolean.TRUE.equals(reply.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
        }

        MessageDO message = messageMapper.findById(spaceId, reply.getMessageId());
        if (message == null || Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
        }

        Long currentUserId = StpUtil.getLoginIdAsLong();
        if (!Objects.equals(currentUserId, reply.getFromUserId())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_DELETE_FORBIDDEN);
        }

        Set<Long> replyIds = messageReplyMapper.collectReplyTreeIds(spaceId, replyId);
        int updatedRows = messageReplyMapper.softDeleteByIds(spaceId, replyIds, LocalDateTime.now());
        if (updatedRows == 0) {
            throw new BizException(ResponseCodeEnum.MESSAGE_REPLY_NOT_EXIST);
        }
        return Response.success();
    }

    private Long requireCurrentSpaceId() {
        // 只取「未解绑空间」中的有效成员关系：status=5 的历史残留不再代表可访问的空间。
        List<CoupleMemberDO> memberships = coupleMemberMapper.selectActiveInLiveSpaces(StpUtil.getLoginIdAsLong());
        if (memberships == null || memberships.isEmpty()) {
            if (coupleMemberMapper.countActiveByUserId(StpUtil.getLoginIdAsLong()) > 0) {
                throw new BizException(ResponseCodeEnum.SPACE_UNBOUND);
            }
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return memberships.get(0).getSpaceId();
    }

    private Long parseId(String rawId, ResponseCodeEnum errorCode) {
        try {
            return Long.valueOf(rawId.trim());
        } catch (NumberFormatException e) {
            throw new BizException(errorCode);
        }
    }

    private void addUserId(Set<Long> userIds, Long userId) {
        if (userId != null) {
            userIds.add(userId);
        }
    }

    private UserDO getUser(Map<Long, UserDO> userMap, Long userId) {
        return userId == null ? null : userMap.get(userId);
    }

    private String getDisplayName(Map<Long, UserDO> userMap, Long userId) {
        UserDO user = getUser(userMap, userId);
        return user == null ? "匿名" : StrUtil.blankToDefault(user.getDisplayName(), "恋人");
    }

    private String getAvatar(Map<Long, UserDO> userMap, Long userId) {
        UserDO user = getUser(userMap, userId);
        return user == null ? "" : StrUtil.blankToDefault(user.getAvatar(), "");
    }
}
