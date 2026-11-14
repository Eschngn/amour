package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceReviewStatusVO;
import com.chengliuxiang.amour.web.service.SpaceReviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

/**
 * 用户端空间公开审核状态。
 *
 * <p>目标空间只由当前登录用户的有效成员关系推导，客户端不能传入 spaceId。</p>
 */
@RestController
@RequestMapping("/space/review")
public class SpaceReviewController {

    @Resource
    private SpaceReviewService spaceReviewService;

    @ApiOperationLog(description = "查看空间公开审核状态")
    @GetMapping("/status")
    public Response<SpaceReviewStatusVO> status() {
        return spaceReviewService.getStatus();
    }

    @ApiOperationLog(description = "重新提交空间公开审核")
    @PostMapping("/resubmit")
    public Response<SpaceReviewStatusVO> resubmit() {
        return spaceReviewService.resubmit();
    }
}
