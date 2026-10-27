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
@AllArgsConstructor
@NoArgsConstructor
@Builder
@TableName(value = "app_user", autoResultMap = true)
public class UserDO {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String username;

    private String password;

    private String displayName;

    private String avatar;

    private String wechatOpenid;

    private LocalDateTime usernameUpdateTime;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isDeleted;
}
