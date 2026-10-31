package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@TableName("user")
public class UserDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 恋语ID，系统随机生成且对外展示
     */
    private String amourId;

    private String username;

    private String password;

    private String displayName;

    private String avatar;

    private String wechatOpenid;

    private LocalDateTime usernameUpdateTime;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private Boolean isDeleted;

    /**
     * 是否为平台管理员
     */
    private Boolean isPlatformAdmin;
}
