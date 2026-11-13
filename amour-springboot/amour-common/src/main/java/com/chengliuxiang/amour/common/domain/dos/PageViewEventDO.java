package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户侧有效页面浏览事件。
 *
 * <p>只保存统计所需的最小信息：服务端统计日期、页面标识、去重访客键与登录用户内部 ID。
 * 不保存完整 URL、referer、IP 明文、openid、token 等敏感数据。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("page_view_event")
public class PageViewEventDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 客户端幂等键（UUID），用于抵御同一事件的短时重复提交。
     */
    private String eventId;

    /**
     * 服务端按 Asia/Shanghai 计算的统计日期，格式 yyyy-MM-dd。
     * 使用字符串与 MySQL/SQLite 都保持一致的比较与分组语义。
     */
    private String viewDate;

    /**
     * 页面标识（白名单），例如 home / plaza / story_detail。
     */
    private String pageKey;

    /**
     * 访客去重键：SHA-256(u:用户ID) 或 SHA-256(g:游客随机ID)，不含明文身份。
     */
    private String visitorKey;

    /**
     * 登录用户内部 ID；游客为空。仅用于追溯登录用户的去重来源。
     */
    private Long userId;

    /**
     * 服务端接收时间，不作为统计日期来源。
     */
    private LocalDateTime createTime;
}
