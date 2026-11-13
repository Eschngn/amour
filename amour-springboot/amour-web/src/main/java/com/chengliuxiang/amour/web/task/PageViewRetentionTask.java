package com.chengliuxiang.amour.web.task;

import com.chengliuxiang.amour.common.constant.PageViewConstants;
import com.chengliuxiang.amour.common.domain.mapper.PageViewEventMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 页面浏览事件保留期清理。
 *
 * <p>事件只用于活跃度统计，超过 {@link PageViewConstants#RETENTION_DAYS} 天的数据每天凌晨删除。
 * 清理条件命中 view_date 索引，不会做无界扫描。</p>
 */
@Component
@Slf4j
public class PageViewRetentionTask {

    private static final ZoneId ZONE = ZoneId.of(PageViewConstants.TIME_ZONE);

    @Resource
    private PageViewEventMapper pageViewEventMapper;

    @Scheduled(cron = "${amour.analytics.retention-cron:0 30 4 * * *}")
    public void purgeExpiredEvents() {
        String beforeDate = LocalDate.now(ZONE)
                .minusDays(PageViewConstants.RETENTION_DAYS)
                .toString();
        int deleted = pageViewEventMapper.deleteBefore(beforeDate);
        if (deleted > 0) {
            log.info("已清理 {} 条早于 {} 的页面浏览事件", deleted, beforeDate);
        }
    }
}
