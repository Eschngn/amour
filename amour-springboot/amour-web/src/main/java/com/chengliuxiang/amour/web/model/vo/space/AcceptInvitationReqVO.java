package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptInvitationReqVO {

    /**
     * 邀请令牌，用于链接邀请或扫描邀请链接后接受。
     */
    @Size(max = 128, message = "邀请令牌格式不正确")
    private String token;

    /**
     * 邀请 ID，用于受邀用户在“我收到的邀请”列表中直接接受。
     */
    private Long invitationId;
}
