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
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("photo_category")
public class PhotoCategoryDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String categoryName;

    private Integer sortOrder;

    private Boolean isEnabled;

    private String remark;

    private Long createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
