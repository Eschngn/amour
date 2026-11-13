package com.chengliuxiang.amour.web.model.vo.analytics;

import lombok.Data;

import javax.validation.constraints.Size;

/**
 * 用户侧页面浏览上报。
 *
 * <p>不接收客户端时间戳、完整 URL 或 referer：统计日期以服务端接收时间为准，
 * 页面只上报白名单路由键，访客只上报第一方随机 ID。</p>
 */
@Data
public class PageViewEventReqVO {

    /**
     * 页面标识，必须在服务端白名单内。
     */
    @Size(max = 40, message = "页面标识过长")
    private String pageKey;

    /**
     * 游客第一方随机访客 ID（32 位十六进制）。已登录用户可省略。
     */
    @Size(max = 64, message = "访客标识过长")
    private String visitorId;

    /**
     * 客户端幂等键（UUID），可选；缺省时由服务端生成。
     */
    @Size(max = 64, message = "事件标识过长")
    private String eventId;
}
