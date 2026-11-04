package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationTokenReqVO {

    @NotBlank(message = "邀请令牌不能为空")
    @Size(max = 128, message = "邀请令牌格式不正确")
    private String token;
}
