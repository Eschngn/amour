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
@AllArgsConstructor
@NoArgsConstructor
@Builder
@TableName(value = "story_chapter", autoResultMap = true)
public class StoryChapterDO {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String name;

    private String colorCode;

    private Integer sortOrder;

    @TableField(typeHandler = BooleanSmallIntTypeHandler.class)
    private Boolean isVisible;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
