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

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "anniversary", autoResultMap = true)
public class AnniversaryDO {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String title;

    private String description;

    private LocalDate anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private String location;

    private Integer sortOrder;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isVisible;

private String createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isDeleted;
}
