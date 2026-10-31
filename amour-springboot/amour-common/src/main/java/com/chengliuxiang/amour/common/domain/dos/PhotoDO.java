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

    private Long spaceId;

    private Long photoCategoryId;

    private String title;

    private String description;

    private String url;

    private LocalDateTime takenTime;

    private String location;

    private Integer sortOrder;

    private Boolean isCover;

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏
     */
    private Integer visibility;

    private Boolean isDeleted;

    private Long createdBy;

    private Long updatedBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
