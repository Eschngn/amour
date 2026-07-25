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
@TableName("photo")
public class PhotoDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String description;

    private Long photoCategoryId;

    private String url;

    private LocalDateTime takenTime;

    private String location;

    private Integer sortOrder;

    private Boolean isCover;

    private Boolean isVisible;

    private Long createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private Boolean isDeleted;
}
