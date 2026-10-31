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
@TableName("couple_invitation")
public class CoupleInvitationDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    private Long inviterUserId;

    /**
     * 指定受邀用户 ID，为空表示持有邀请链接的账号可申请
     */
    private Long inviteeUserId;

    /**
     * 邀请令牌 SHA-256 摘要
     */
    private String tokenHash;

    /**
     * 邀请状态：0-待接受 1-已接受 2-已撤销 3-已过期 4-已拒绝
     */
    private Integer status;

    private LocalDateTime expiresAt;

    private LocalDateTime acceptedAt;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
