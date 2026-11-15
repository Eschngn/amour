package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 故事排序接口返回的轻量列表项，包含全局排序与章节内排序两套值。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryNodeSortItemVO {

    private Long id;

    private Long chapterId;

    private String title;

    /** 章节内排序值。 */
    private Integer sortOrder;

    /** 跨章节的全局排序值。 */
    private Integer globalSortOrder;
}
