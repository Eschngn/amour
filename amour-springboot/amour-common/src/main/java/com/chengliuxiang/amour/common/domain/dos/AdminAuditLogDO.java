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
 * 后台管理操作审计。
 *
 * <p>只记录管理员、动作、目标、原因、结果和必要的状态摘要；
 * 禁止写入内容正文、密码、openid、邀请明文 token。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("admin_audit_log")
public class AdminAuditLogDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long adminUserId;

    private String action;

    private String targetType;

    private Long targetSpaceId;

    private String targetContentType;

    private Long targetContentId;

    private Long targetUserId;

    /**
     * 空间公开审核提交 ID，仅审核相关动作写入。
     */
    private Long targetReviewId;

    private String reason;

    /**
     * SUCCESS / FAILURE
     */
    private String result;

    /**
     * 必要的状态摘要（例如 visibility 前后值），不包含正文。
     */
    private String detail;

    private LocalDateTime createTime;
}
