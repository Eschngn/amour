package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.chengliuxiang.amour.common.config.BooleanSmallIntTypeHandler;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "permission", autoResultMap = true)
public class PermissionDO {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
private String parentId;
    private String name;
    private Integer type;
    private String menuUrl;
    private String menuIcon;
    private Integer sort;
    private String permissionKey;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isDeleted;
}
