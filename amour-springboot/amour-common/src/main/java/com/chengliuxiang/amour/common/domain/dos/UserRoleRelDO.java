package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.chengliuxiang.amour.common.config.BooleanSmallIntTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName(value = "user_role_rel", autoResultMap = true)
public class UserRoleRelDO {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
    private String userId;
    private String roleId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isDeleted;
}
