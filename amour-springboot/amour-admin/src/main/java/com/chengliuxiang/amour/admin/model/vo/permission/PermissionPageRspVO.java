package com.chengliuxiang.amour.admin.model.vo.permission;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PermissionPageRspVO {
    private Long id;
    private Long parentId;
    private String name;
    private Integer type;
    private String menuUrl;
    private String menuIcon;
    private Integer sort;
    private String permissionKey;
    private Integer status;
    private String createTime;
    private String updateTime;
    private long roleCount;
    private List<PermissionPageRspVO> children;
}
