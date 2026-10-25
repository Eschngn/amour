package com.chengliuxiang.amour.admin.model.vo.role;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RolePageRspVO {
    private String id;
    private String roleName;
    private String roleKey;
    private Integer status;
    private Integer sort;
    private String remark;
    private String createTime;
    private String updateTime;
    private List<String> permissionIds;
}
