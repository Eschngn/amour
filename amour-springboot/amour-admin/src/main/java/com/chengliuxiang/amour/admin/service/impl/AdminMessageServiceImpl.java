package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDeleteReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.message.DeleteMessageReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListRspVO;
import com.chengliuxiang.amour.admin.service.AdminContentGovernanceService;
import com.chengliuxiang.amour.admin.service.AdminMessageService;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 兼容旧路径的留言治理实现。留言始终是空间私密内容（visibility=0），
 * 后台只提供按空间查看和违规逻辑删除，不提供代发/代回复。
 */
@Service
public class AdminMessageServiceImpl implements AdminMessageService {

    @Resource
    private AdminContentGovernanceService adminContentGovernanceService;

    @Override
    public Response<PageResult<FindMessagePageListRspVO>> findMessagePageList(FindMessagePageListReqVO reqVO) {
        AdminContentPageReqVO query = new AdminContentPageReqVO();
        query.setCurrent(reqVO.getCurrent());
        query.setSize(reqVO.getSize());
        query.setSpaceId(reqVO.getSpaceId());
        query.setKeyword(reqVO.getContent());
        query.setIncludeDeleted(reqVO.getIncludeDeleted());
        query.setContentType(ContentGovernanceConstants.TYPE_MESSAGE);

        Response<PageResult<AdminContentPageRspVO>> response = adminContentGovernanceService.findPage(query);
        PageResult<AdminContentPageRspVO> page = response.getData();
        List<FindMessagePageListRspVO> records = page.getRecords().stream()
                .map(item -> FindMessagePageListRspVO.builder()
                        .messageId(String.valueOf(item.getContentId()))
                        .spaceId(item.getSpaceId())
                        .spaceCode(item.getSpaceCode())
                        .spaceName(item.getSpaceName())
                        .userName(item.getAuthorName())
                        .userAmourId(item.getAuthorAmourId())
                        .content(item.getTitle())
                        .replyCount(item.getReplyCount() == null ? 0L : item.getReplyCount().longValue())
                        .visibility(item.getVisibility())
                        .visibilityText(item.getVisibilityText())
                        .deleted(item.getDeleted())
                        .createTime(item.getCreateTime())
                        .updateTime(item.getUpdateTime())
                        .build())
                .collect(Collectors.toList());
        return Response.success(PageResult.<FindMessagePageListRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<Void> deleteMessage(DeleteMessageReqVO reqVO) {
        Long messageId = parseMessageId(reqVO.getMessageId());
        AdminContentDeleteReqVO delete = new AdminContentDeleteReqVO();
        delete.setContentType(ContentGovernanceConstants.TYPE_MESSAGE);
        delete.setContentId(messageId);
        delete.setSpaceId(reqVO.getSpaceId());
        delete.setReason(reqVO.getReason());
        return adminContentGovernanceService.deleteContent(delete);
    }

    private Long parseMessageId(String messageId) {
        try {
            return Long.valueOf(StrUtil.trim(messageId));
        } catch (NumberFormatException exception) {
            throw new BizException(ResponseCodeEnum.MESSAGE_NOT_EXIST);
        }
    }
}
