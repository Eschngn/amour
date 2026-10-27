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

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@TableName(value = "story_node", autoResultMap = true)
public class StoryNodeDO {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

private String chapterId;

    private String title;

    private String summary;

    private String content;

    private LocalDateTime happenedTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Integer sortOrder;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isMilestone;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isVisible;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isDeleted;

private String createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
