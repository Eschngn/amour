package com.chengliuxiang.amour.web.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 启用应用内定时任务（页面浏览事件保留期清理）。
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
