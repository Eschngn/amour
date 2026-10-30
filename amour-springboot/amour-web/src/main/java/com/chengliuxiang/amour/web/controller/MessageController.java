package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.message.MessageDeleteReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePageItemVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePublishReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageReplyDeleteReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageReplyReqVO;
import com.chengliuxiang.amour.web.service.MessageService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.validation.Valid;

@RestController
@RequestMapping("/message")
public class MessageController {

    @Resource
    private MessageService messageService;

    @ApiOperationLog(description = "留言分页查询")
    @PostMapping("/page")
    public Response<PageResult<MessagePageItemVO>> pageMessages(@Valid MessagePageQueryReqVO reqVO) {
        return messageService.pageMessages(reqVO);
    }

    @ApiOperationLog(description = "发布留言")
    @PostMapping("/publish")
    public Response<Void> publishMessage(@Valid @RequestBody MessagePublishReqVO reqVO) {
        return messageService.publishMessage(reqVO);
    }

    @ApiOperationLog(description = "回复留言")
    @PostMapping("/reply")
    public Response<Void> replyMessage(@Valid @RequestBody MessageReplyReqVO reqVO) {
        return messageService.replyMessage(reqVO);
    }

    @ApiOperationLog(description = "删除自己的留言")
    @PostMapping("/delete")
    public Response<Void> deleteMessage(@Valid @RequestBody MessageDeleteReqVO reqVO) {
        return messageService.deleteMessage(reqVO);
    }

    @ApiOperationLog(description = "删除自己的回复")
    @PostMapping("/reply/delete")
    public Response<Void> deleteReply(@Valid @RequestBody MessageReplyDeleteReqVO reqVO) {
        return messageService.deleteReply(reqVO);
    }
}
