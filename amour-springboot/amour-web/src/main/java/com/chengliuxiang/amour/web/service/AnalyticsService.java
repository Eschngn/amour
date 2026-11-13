package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.web.model.vo.analytics.PageViewEventReqVO;

import javax.servlet.http.HttpServletRequest;

/**
 * 用户侧页面浏览采集。
 */
public interface AnalyticsService {

    /**
     * 记录一次有效页面浏览。采集失败不应影响用户页面主流程。
     */
    void recordPageView(PageViewEventReqVO reqVO, HttpServletRequest request);
}
