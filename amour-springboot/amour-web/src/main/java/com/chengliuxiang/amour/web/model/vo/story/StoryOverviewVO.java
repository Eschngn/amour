package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class StoryOverviewVO {

    private Integer totalNodes;       // 故事节点总数
    private Integer totalSeasons;     // 跨越几个季节
    private Integer totalChapters;    // 章节数
    private LocalDateTime startDate;      // 故事起始日期（最早节点的 happened_at）
    private List<StoryChapterVO> chapters;
}
