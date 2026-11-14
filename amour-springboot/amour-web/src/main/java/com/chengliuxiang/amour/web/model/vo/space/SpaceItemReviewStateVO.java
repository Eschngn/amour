package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 单个内容项的公开审核状态。
 *
 * <p>状态优先级：PENDING &gt; REJECTED &gt; UNPUBLISHED &gt; PUBLISHED。
 * hasPublishedVersion 表示恋爱广场当前是否仍展示该内容的已通过版本。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceItemReviewStateVO {

    private String reviewStatus;

    private String reviewRejectReason;

    private LocalDateTime reviewHandledAt;

    private Boolean hasPublishedVersion;
}
