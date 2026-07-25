package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
        Page<MessageDO> page = new Page<>(reqVO.getCurrent(), reqVO.getSize());
        LambdaQueryWrapper<MessageDO> wrapper = new LambdaQueryWrapper<MessageDO>()
                .like(StrUtil.isNotBlank(reqVO.getContent()), MessageDO::getContent, reqVO.getContent())
                .eq(MessageDO::getIsDeleted, false)
                .orderByDesc(MessageDO::getCreateTime);
        IPage<MessageDO> messagePage = messageMapper.selectPage(page, wrapper);

        List<MessageDO> messages = messagePage.getRecords();
        if (CollUtil.isEmpty(messages)) {
            return Response.success(PageResult.<FindMessagePageListRspVO>builder()
                    .current(messagePage.getCurrent())
                    .size(messagePage.getSize())
                    .total(messagePage.getTotal())
                    .records(Collections.emptyList())
                    .build());
        }

        List<String> messageIds = messages.stream()
                .map(MessageDO::getId)
                .collect(Collectors.toList());
        List<MessageReplyDO> replies = messageReplyMapper.selectList(
                new LambdaQueryWrapper<MessageReplyDO>()
                        .in(MessageReplyDO::getMessageId, messageIds)
                        .eq(MessageReplyDO::getIsDeleted, false));
        Map<String, Long> replyCountMap = replies.stream()
                .collect(Collectors.groupingBy(MessageReplyDO::getMessageId, Collectors.counting()));

        Set<Long> userIds = new HashSet<>();
        messages.forEach(message -> addUserId(userIds, message.getUserId()));
        Map<Long, String> userNameMap = new HashMap<>();
        if (CollUtil.isNotEmpty(userIds)) {
            userNameMap.putAll(userMapper.selectList(
                            new LambdaQueryWrapper<UserDO>().in(UserDO::getId, userIds))
                    .stream()
                    .collect(Collectors.toMap(UserDO::getId,
                            user -> StrUtil.blankToDefault(user.getDisplayName(), "恋人"))));
        }

        List<FindMessagePageListRspVO> records = messages.stream()
                .map(message -> FindMessagePageListRspVO.builder()
                        .messageId(message.getId())
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
        String messageId = reqVO.getMessageId().trim();
        int updatedRows = messageMapper.update(null,
                new LambdaUpdateWrapper<MessageDO>()
                        .eq(MessageDO::getId, messageId)
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

    private void addUserId(Set<Long> userIds, String userId) {
        if (StrUtil.isNotBlank(userId)) {
            try {
                userIds.add(Long.valueOf(userId));
            } catch (NumberFormatException ignored) {
                log.warn("Invalid message user id: {}", userId);
            }
        }
    }

    private String getUserName(Map<Long, String> userNameMap, String userId) {
        if (StrUtil.isBlank(userId)) {
            return null;
        }
        try {
            return userNameMap.get(Long.valueOf(userId));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.format(DATE_TIME_FORMATTER);
    }
}
