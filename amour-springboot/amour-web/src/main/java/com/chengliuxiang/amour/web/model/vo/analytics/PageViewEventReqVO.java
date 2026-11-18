package com.chengliuxiang.amour.web.model.vo.analytics;

import lombok.Data;

import javax.validation.constraints.Size;

/**
 * 用户侧页面浏览上报。
 *
 * <p>不接收客户端时间戳、完整 URL 或 referer：统计日期以服务端接收时间为准，
 * 页面只上报白名单路由键，访客只上报第一方随机 ID。</p>
 *
 * <p>{@code clientType} 是采集端自报的访问渠道（web / miniprogram），
 * 服务端只允许白名单值，未上报时按 web 兼容。它仅用于统计分渠道，
 * 不参与任何鉴权或权限判断。</p>
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

    /**
     * 访问渠道（客户端类型）：web / miniprogram。
     *
     * <p>可选字段：旧版网页端不上报，服务端统一按 web 处理；
     * 其它值一律拒绝，避免事件表被写成任意渠道名。</p>
     */
    @Size(max = 20, message = "客户端类型过长")
    private String clientType;
}
