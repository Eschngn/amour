package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitationRspVO {

    private Long invitationId;

    /**
     * 明文邀请令牌，仅在创建时返回一次，用于生成邀请链接。
     */
    private String token;

    private LocalDateTime expiresAt;

    private String inviteeAmourId;
}
