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

    private String amourId;

    private String username;

    private String displayName;

    private String avatar;

    /** 前台模块展示权限，兼容现有前端；服务端不再做权限校验。 */
    private java.util.Set<String> permissions;
}
