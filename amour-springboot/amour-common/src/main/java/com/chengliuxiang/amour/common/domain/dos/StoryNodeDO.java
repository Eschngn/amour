package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@TableName("story_node")
public class StoryNodeDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long chapterId;

    private String title;

    private String summary;

    private String content;

    private LocalDateTime happenedTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Integer sortOrder;

    private Boolean isMilestone;

    private Boolean isVisible;

    private Boolean isDeleted;

    private Long createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
