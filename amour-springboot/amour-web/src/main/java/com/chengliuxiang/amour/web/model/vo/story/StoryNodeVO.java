package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class StoryNodeVO {
    private Long id;
    private String title;
    private String summary;
    private String content;
    private LocalDateTime happenedTime;   // 发生时间（可为 null）
    private String location;          // 地点
    private String coverImage;        // 封面图
    private String tagLabel;          // 标签文字
    private String tagColor;          // 标签颜色
    private Boolean isMilestone;      // 是否里程碑
    private List<StoryNodeImageVO> images;  // 图片列表
}
