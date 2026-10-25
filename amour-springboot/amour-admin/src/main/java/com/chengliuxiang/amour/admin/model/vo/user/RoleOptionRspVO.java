package com.chengliuxiang.amour.admin.model.vo.user;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class RoleOptionRspVO {
    private String id;
    private String roleName;
    private String roleKey;
}
