package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.analytics.PageViewEventReqVO;
import com.chengliuxiang.amour.web.service.AnalyticsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;

/**
 * 用户侧页面浏览采集入口。
 *
 * <p>该接口允许匿名访问，但只接受白名单页面键和格式合法的访客标识，
 * 不接收客户端时间、完整 URL 或任何直接身份信息。前端以 fire-and-forget 方式调用，
 * 采集失败不会阻塞或中断页面访问。</p>
 */
@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    @Resource
    private AnalyticsService analyticsService;

    @PostMapping("/page-view")
    public Response<Void> pageView(@RequestBody(required = false) PageViewEventReqVO reqVO,
                                   HttpServletRequest request) {
        analyticsService.recordPageView(reqVO, request);
        return Response.success();
    }
}
