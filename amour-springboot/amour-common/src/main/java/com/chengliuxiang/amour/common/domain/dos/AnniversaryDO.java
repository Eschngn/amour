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

    private Long spaceId;

    private String title;

    private String description;

    private LocalDate anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private String location;

    private Integer sortOrder;

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏
     */
    private Integer visibility;

    private Boolean isDeleted;

    private Long createdBy;

    private Long updatedBy;

    /**
     * 内容工作版本号，每次保存成功后递增；审核快照记录生成时的版本。
     */
    private Integer revision;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
