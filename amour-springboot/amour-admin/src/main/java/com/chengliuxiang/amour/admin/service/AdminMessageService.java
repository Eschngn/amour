package com.chengliuxiang.amour.admin.service;

import com.chengliuxiang.amour.admin.model.vo.message.DeleteMessageReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListRspVO;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;

public interface AdminMessageService {
    /**
     * 分页查询留言列表。
     */
    Response<PageResult<FindMessagePageListRspVO>> findMessagePageList(FindMessagePageListReqVO reqVO);

    /**
     * 逻辑删除留言及其回复。
     */
    Response<Void> deleteMessage(DeleteMessageReqVO reqVO);
}
