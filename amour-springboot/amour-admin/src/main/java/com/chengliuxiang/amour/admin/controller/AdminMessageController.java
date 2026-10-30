package com.chengliuxiang.amour.admin.controller;

import com.chengliuxiang.amour.admin.model.vo.message.DeleteMessageReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.message.FindMessagePageListRspVO;
import com.chengliuxiang.amour.admin.service.AdminMessageService;
import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/admin/message")
public class AdminMessageController {

    @Resource
    private AdminMessageService adminMessageService;

    @PostMapping("/list")
    @ApiOperationLog(description = "查询留言分页数据")
    public Response<PageResult<FindMessagePageListRspVO>> findMessagePageList(
            @RequestBody FindMessagePageListReqVO reqVO) {
        return adminMessageService.findMessagePageList(reqVO);
    }

    @PostMapping("/delete")
    @ApiOperationLog(description = "逻辑删除留言")
    public Response<Void> deleteMessage(@RequestBody @Validated DeleteMessageReqVO reqVO) {
        return adminMessageService.deleteMessage(reqVO);
    }
}
