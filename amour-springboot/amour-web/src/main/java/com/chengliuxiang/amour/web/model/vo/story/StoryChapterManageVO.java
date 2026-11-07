package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用户端故事章节管理数据（包含隐藏章节）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryChapterManageVO {

    private Long id;

    private String name;

    private String colorCode;

    private Integer sortOrder;

    private Boolean isVisible;

    private Integer nodeCount;
}
