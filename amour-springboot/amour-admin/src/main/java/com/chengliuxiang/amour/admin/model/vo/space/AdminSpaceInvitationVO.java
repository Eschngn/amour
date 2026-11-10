package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 后台空间邀请摘要。绝不返回邀请明文 token 或 token_hash。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceInvitationVO {

    private Long invitationId;

    private String inviterAmourId;

    private String inviterName;

    private String inviteeAmourId;

    private String inviteeName;

    private Integer status;

    private String statusText;

    private String expiresAt;

    private String acceptedAt;

    private String createTime;

    /**
     * 仅用于展示的脱敏摘要，例如 a1b2c3****。
     */
    private String tokenMasked;
}
