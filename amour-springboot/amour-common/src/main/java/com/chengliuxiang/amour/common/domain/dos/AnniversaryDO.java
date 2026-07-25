package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
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
@TableName("anniversary")
public class AnniversaryDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String description;

    private LocalDate anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private String location;

    private Integer sortOrder;

    private Boolean isVisible;

    private Long createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private Boolean isDeleted;
}
