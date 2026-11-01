package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.admin.model.vo.message.DeleteMessageReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListRspVO;
import com.chengliuxiang.amour.admin.service.AdminMessageService;
import com.chengliuxiang.amour.common.domain.dos.MessageDO;
import com.chengliuxiang.amour.common.domain.dos.MessageReplyDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.MessageMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageReplyMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AdminMessageServiceImpl implements AdminMessageService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private MessageMapper messageMapper;
    @Resource
    private MessageReplyMapper messageReplyMapper;
    @Resource
    private UserMapper userMapper;

    @Override
    public Response<PageResult<FindMessagePageListRspVO>> findMessagePageList(FindMessagePageListReqVO reqVO) {
        IPage<MessageDO> messagePage = messageMapper.selectAdminPage(
                reqVO.getCurrent(), reqVO.getSize(), null, reqVO.getContent());

        List<MessageDO> messages = messagePage.getRecords();
        if (CollUtil.isEmpty(messages)) {
            return Response.success(PageResult.<FindMessagePageListRspVO>builder()
                    .current(messagePage.getCurrent())
                    .size(messagePage.getSize())
                    .total(messagePage.getTotal())
                    .records(Collections.emptyList())
                    .build());
        }

        List<MessageReplyDO> replies = loadReplies(messages);
        Map<Long, Long> replyCountMap = replies.stream()
                .collect(Collectors.groupingBy(MessageReplyDO::getMessageId, Collectors.counting()));

        Set<Long> userIds = new HashSet<>();
        messages.forEach(message -> addUserId(userIds, message.getUserId()));
        Map<Long, String> userNameMap = new HashMap<>();
        if (CollUtil.isNotEmpty(userIds)) {
            userNameMap.putAll(userMapper.findUsersByIds(userIds)
                    .stream()
                    .collect(Collectors.toMap(UserDO::getId,
                            user -> StrUtil.blankToDefault(user.getDisplayName(), "恋人"))));
        }

        List<FindMessagePageListRspVO> records = messages.stream()
                .map(message -> FindMessagePageListRspVO.builder()
                        .messageId(String.valueOf(message.getId()))
                        .userName(getUserName(userNameMap, message.getUserId()))
                        .content(message.getContent())
                        .replyCount(replyCountMap.getOrDefault(message.getId(), 0L))
                        .createTime(formatDateTime(message.getCreateTime()))
                        .build())
                .collect(Collectors.toList());

        return Response.success(PageResult.<FindMessagePageListRspVO>builder()
                .current(messagePage.getCurrent())
                .size(messagePage.getSize())
                .total(messagePage.getTotal())
                .records(records)
                .build());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteMessage(DeleteMessageReqVO reqVO) {
        Long messageId = parseMessageId(reqVO.getMessageId());
        MessageDO message = messageMapper.selectById(messageId);
        if (message == null || Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        int updatedRows = messageMapper.softDelete(message.getSpaceId(), messageId, LocalDateTime.now());
        if (updatedRows == 0) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }

        messageReplyMapper.softDeleteByMessageId(message.getSpaceId(), messageId, LocalDateTime.now());
        return Response.success();
    }

    private List<MessageReplyDO> loadReplies(List<MessageDO> messages) {
        Map<Long, List<Long>> messageIdsBySpaceId = messages.stream()
                .filter(message -> message.getSpaceId() != null)
                .collect(Collectors.groupingBy(MessageDO::getSpaceId,
                        Collectors.mapping(MessageDO::getId, Collectors.toList())));
        return messageIdsBySpaceId.entrySet().stream()
                .flatMap(entry -> messageReplyMapper
                        .selectActiveByMessageIds(entry.getKey(), entry.getValue()).stream())
                .collect(Collectors.toList());
    }

    private Long parseMessageId(String messageId) {
        try {
            return Long.valueOf(StrUtil.trim(messageId));
        } catch (NumberFormatException exception) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }
    }

    private void addUserId(Set<Long> userIds, Long userId) {
        if (userId != null) {
            userIds.add(userId);
        }
    }

    private String getUserName(Map<Long, String> userNameMap, Long userId) {
        return userId == null ? null : userNameMap.get(userId);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.format(DATE_TIME_FORMATTER);
    }
}
