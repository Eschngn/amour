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
 * 举报处理记录。
 *
 * <p>与 content_report 分表保存处理备注，避免对既有举报表做不可重复执行的
 * ALTER 迁移；同一举报只允许一条处理记录。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("content_report_handle")
public class ContentReportHandleDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long reportId;

    private Long adminUserId;

    /**
     * reject / confirm
     */
    private String action;

    private String note;

    private LocalDateTime createTime;
}
