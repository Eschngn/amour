package com.chengliuxiang.amour.web.service.impl;

import com.chengliuxiang.amour.common.constant.PageViewConstants;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 页面浏览采集的进程内频控。
 *
 * <p>按访客和 IP 各做一分钟计数，缓存条目写入后一分钟过期。
 * 多实例部署时各实例独立计数，属于粗粒度保护，不追求精确配额。</p>
 */
@Component
public class PageViewRateLimiter {

    private static final int MAX_TRACKED_VISITORS = 200_000;
    private static final int MAX_TRACKED_IPS = 50_000;

    private final Cache<String, AtomicInteger> visitorCounters = CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.MINUTES)
            .maximumSize(MAX_TRACKED_VISITORS)
            .build();

    private final Cache<String, AtomicInteger> ipCounters = CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.MINUTES)
            .maximumSize(MAX_TRACKED_IPS)
            .build();

    /**
     * @return true 表示允许本次上报；false 表示超过短时上限。
     */
    public boolean tryAcquire(String visitorKey, String clientIp) {
        if (increment(visitorCounters, visitorKey) > PageViewConstants.MAX_EVENTS_PER_VISITOR_PER_MINUTE) {
            return false;
        }
        return increment(ipCounters, clientIp) <= PageViewConstants.MAX_EVENTS_PER_IP_PER_MINUTE;
    }

    private int increment(Cache<String, AtomicInteger> counters, String key) {
        if (key == null) {
            return 1;
        }
        AtomicInteger counter = counters.getIfPresent(key);
        if (counter == null) {
            AtomicInteger created = new AtomicInteger();
            AtomicInteger existing = counters.asMap().putIfAbsent(key, created);
            counter = existing == null ? created : existing;
        }
        return counter.incrementAndGet();
    }
}
