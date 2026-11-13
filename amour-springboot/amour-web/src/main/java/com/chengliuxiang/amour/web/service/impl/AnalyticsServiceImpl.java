package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.DigestUtil;
import com.chengliuxiang.amour.common.constant.PageViewConstants;
import com.chengliuxiang.amour.common.domain.dos.PageViewEventDO;
import com.chengliuxiang.amour.common.domain.mapper.PageViewEventMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.web.model.vo.analytics.PageViewEventReqVO;
import com.chengliuxiang.amour.web.service.AnalyticsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * 页面浏览采集。
 *
 * <p>只接受白名单页面键；统计日期与接收时间全部使用服务端时间，
 * 客户端无法补录历史或未来日期。已登录用户用内部用户 ID 派生去重键，
 * 游客用第一方随机 ID，两者都先做 SHA-256，表中不落明文身份。</p>
 *
 * <p>明显自动化请求（常见爬虫 UA）直接忽略但仍返回成功，避免采集端被用来探测过滤规则；
 * 这不是完整的机器人识别，后台页面会明确说明该限制。</p>
 */
@Service
@Slf4j
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final ZoneId ZONE = ZoneId.of(PageViewConstants.TIME_ZONE);

    private static final Pattern VISITOR_ID_PATTERN = Pattern.compile("^[0-9a-fA-F]{32}$");
    private static final Pattern EVENT_ID_PATTERN = Pattern.compile("^[0-9a-fA-F-]{16,64}$");

    /**
     * 只拦截明确带自动化标识的 UA；未知或空 UA 仍按正常访问采集。
     */
    private static final List<String> OBVIOUS_BOT_UA_MARKERS = Arrays.asList(
            "bot", "spider", "crawl", "headlesschrome", "headless browser",
            "curl/", "wget/", "python-requests", "scrapy", "httpclient", "phantomjs");

    @Resource
    private PageViewEventMapper pageViewEventMapper;

    @Resource
    private PageViewRateLimiter pageViewRateLimiter;

    @Override
    public void recordPageView(PageViewEventReqVO reqVO, HttpServletRequest request) {
        if (request.getContentLengthLong() > PageViewConstants.MAX_EVENT_BODY_BYTES) {
            throw new BizException(ResponseCodeEnum.PAGE_VIEW_EVENT_INVALID);
        }
        if (isObviousBot(request.getHeader("User-Agent"))) {
            return;
        }
        if (reqVO == null) {
            throw new BizException(ResponseCodeEnum.PAGE_VIEW_EVENT_INVALID);
        }

        String pageKey = StrUtil.trim(reqVO.getPageKey());
        if (!PageViewConstants.isSupportedPageKey(pageKey)) {
            throw new BizException(ResponseCodeEnum.PAGE_VIEW_EVENT_INVALID);
        }

        boolean loggedIn = StpUtil.isLogin();
        Long userId = null;
        String visitorKey;
        if (loggedIn) {
            userId = StpUtil.getLoginIdAsLong();
            visitorKey = DigestUtil.sha256Hex("u:" + userId);
        } else {
            String visitorId = StrUtil.trim(reqVO.getVisitorId());
            if (visitorId == null || !VISITOR_ID_PATTERN.matcher(visitorId).matches()) {
                throw new BizException(ResponseCodeEnum.PAGE_VIEW_EVENT_INVALID);
            }
            visitorKey = DigestUtil.sha256Hex("g:" + visitorId.toLowerCase(Locale.ROOT));
        }

        if (!pageViewRateLimiter.tryAcquire(visitorKey, resolveClientIp(request))) {
            throw new BizException(ResponseCodeEnum.PAGE_VIEW_TOO_FREQUENT);
        }

        String eventId = StrUtil.trim(reqVO.getEventId());
        if (StrUtil.isBlank(eventId)) {
            eventId = UUID.randomUUID().toString();
        } else if (!EVENT_ID_PATTERN.matcher(eventId).matches()) {
            throw new BizException(ResponseCodeEnum.PAGE_VIEW_EVENT_INVALID);
        }

        PageViewEventDO event = PageViewEventDO.builder()
                .eventId(eventId)
                .viewDate(LocalDate.now(ZONE).toString())
                .pageKey(pageKey)
                .visitorKey(visitorKey)
                .userId(userId)
                .createTime(LocalDateTime.now(ZONE))
                .build();
        if (eventAlreadyExists(eventId)) {
            return;
        }
        try {
            pageViewEventMapper.insert(event);
        } catch (DataAccessException dataAccessException) {
            // SQLite 的唯一约束异常是 UncategorizedSQLException，MySQL 通常是 DuplicateKeyException。
            // 只要幂等键已经落库，就按重复上报处理，避免因为驱动差异把采集打成 500。
            if (eventAlreadyExists(eventId)) {
                log.debug("忽略重复的页面浏览事件: {}", eventId);
                return;
            }
            throw dataAccessException;
        }
    }

    private boolean eventAlreadyExists(String eventId) {
        Long count = pageViewEventMapper.countByEventId(eventId);
        return count != null && count > 0;
    }

    private boolean isObviousBot(String userAgent) {
        if (StrUtil.isBlank(userAgent)) {
            return false;
        }
        String normalized = userAgent.toLowerCase(Locale.ROOT);
        for (String marker : OBVIOUS_BOT_UA_MARKERS) {
            if (normalized.contains(marker)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 只使用直连地址，不信任可伪造的 X-Forwarded-For。
     * 反向代理部署时该值可能是代理地址，仅作为粗粒度频控维度使用。
     */
    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        return StrUtil.isBlank(remoteAddr) ? "unknown" : remoteAddr;
    }
}
