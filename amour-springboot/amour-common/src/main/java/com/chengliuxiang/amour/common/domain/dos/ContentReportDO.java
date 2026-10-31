package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("content_report")
public class ContentReportDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long reporterUserId;

    private Long spaceId;

    /**
     * 被举报类型：space/story/photo/anniversary
     */
    private String contentType;

    private Long contentId;

    private String reason;

    /**
     * 处理状态：0-待处理 1-已处理 2-已驳回
     */
    private Integer status;

    private Long processedBy;

    private LocalDateTime processedAt;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
