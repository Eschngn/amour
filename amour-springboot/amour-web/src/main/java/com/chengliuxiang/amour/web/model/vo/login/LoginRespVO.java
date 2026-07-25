package com.chengliuxiang.amour.web.model.vo.login;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LoginRespVO {

    private String token;

    private String username;

    private String displayName;

    private String avatar;
}
