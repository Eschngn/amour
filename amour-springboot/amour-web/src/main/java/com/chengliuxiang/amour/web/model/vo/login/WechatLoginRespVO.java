package com.chengliuxiang.amour.web.model.vo.login;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WechatLoginRespVO {

    private String token;

    private String displayName;

    private String avatar;
}
