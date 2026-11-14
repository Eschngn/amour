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

    private Long spaceId;

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
