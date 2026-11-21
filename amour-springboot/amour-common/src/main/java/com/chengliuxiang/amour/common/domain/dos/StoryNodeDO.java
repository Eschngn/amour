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

    /**
     * 时间展示精度：true-展示日期和时间 false-仅展示日期。
     * 历史记录与旧客户端未传字段时统一按 true 处理。
     */
    private Boolean showTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    /**
     * 章节内排序值：只在所属章节内生效。
     */
    private Integer sortOrder;

    /**
     * 全局排序值：跨章节生效，仅在未筛选章节时使用。
     *
     * <p>与 sortOrder 分离后，章节内拖拽不会改变故事在全部故事视图中的位置。</p>
     */
    private Integer globalSortOrder;

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
