package com.chengliuxiang.amour.admin.model.vo.role;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PermissionRspVO {
    private Long id;
    private Long parentId;
    private String name;
    private Integer type;
    private String permissionKey;
    private List<PermissionRspVO> children;
}
