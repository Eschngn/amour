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

    private String username;

    private String displayName;

    private String avatar;

    private boolean passwordSet;

    /** 当前用户拥有的前台模块查询权限。 */
    private java.util.Set<String> permissions;
}
