package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("role_permission_rel")
public class RolePermissionRelDO {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long roleId;
    private Long permissionId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Boolean isDeleted;
}
