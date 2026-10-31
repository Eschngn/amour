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
@TableName("couple_space")
public class CoupleSpaceDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String spaceCode;

    private String spaceName;

    private String description;

    private String coverImage;

    /**
     * 空间状态：0-等待绑定 1-正常 2-冻结 3-已归档 4-删除等待期 5-已删除
     */
    private Integer status;

    /**
     * 空间可见性：0-私密 1-公开到恋爱广场
     */
    private Integer visibility;

    private LocalDateTime loveStartTime;

    private LocalDateTime publicAt;

    private LocalDateTime archivedAt;

    private LocalDateTime deleteAfter;

    private Long createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
