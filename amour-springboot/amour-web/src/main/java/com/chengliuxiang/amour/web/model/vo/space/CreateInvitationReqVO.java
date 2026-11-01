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
public class CreateInvitationReqVO {

    /**
     * 指定受邀用户的恋语 ID。为空时创建链接邀请，持有链接的账号均可接受。
     */
    @Size(max = 20, message = "恋语 ID 格式不正确")
    private String inviteeAmourId;
}
