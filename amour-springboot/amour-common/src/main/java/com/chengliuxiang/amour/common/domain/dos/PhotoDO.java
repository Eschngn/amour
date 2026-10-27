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
@TableName(value = "photo", autoResultMap = true)
public class PhotoDO {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String title;

    private String description;

private String photoCategoryId;

    private String url;

    private LocalDateTime takenTime;

    private String location;

    private Integer sortOrder;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isCover;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isVisible;

private String createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isDeleted;
}
