package com.chengliuxiang.amour.common.model.stat;

import lombok.Data;

/**
 * 按渠道聚合的区间 PV / UV。
 *
 * <p>{@code uv} 是该渠道在整段区间内 {@code COUNT(DISTINCT visitor_key)} 的结果，
 * 不能由每日 UV 相加得到。</p>
 */
@Data
public class PageViewChannelStat {

    /**
     * 访问渠道：web / miniprogram。
     */
    private String clientType;

    /**
     * 区间有效页面浏览次数。
     */
    private Long pv;

    /**
     * 区间去重访客数。
     */
    private Long uv;
}
