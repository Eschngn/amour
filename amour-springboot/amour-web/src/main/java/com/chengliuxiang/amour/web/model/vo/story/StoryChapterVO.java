package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class StoryChapterVO {
    private Long id;
    private String name;              // 章节名称
    private String colorCode;         // 主题色
    private Integer sortOrder;
    private LocalDateTime startDate;      // 章节起始时间（该章节最早节点的 happened_time）
    private LocalDateTime endDate;        // 章节结束时间（该章节最晚节点的 happened_time）
    private Integer nodeCount;        // 本章节节点数
    // private List<StoryNodeVO> nodes;
}
