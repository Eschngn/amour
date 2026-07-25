package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.message.MessageDeleteReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePageItemVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePageQueryReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessagePublishReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageReplyDeleteReqVO;
import com.chengliuxiang.amour.web.model.vo.message.MessageReplyReqVO;

public interface MessageService {
    Response<PageResult<MessagePageItemVO>> pageMessages(MessagePageQueryReqVO reqVO);

    Response<Void> publishMessage(MessagePublishReqVO reqVO);

    Response<Void> replyMessage(MessageReplyReqVO reqVO);

    Response<Void> deleteMessage(MessageDeleteReqVO reqVO);

    Response<Void> deleteReply(MessageReplyDeleteReqVO reqVO);
}
