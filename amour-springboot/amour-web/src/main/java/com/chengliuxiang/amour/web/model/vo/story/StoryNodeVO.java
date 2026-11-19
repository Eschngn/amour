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
public class StoryNodeVO {
    private Long id;
    private String title;
    private String summary;
    private String content;
    private LocalDateTime happenedTime;   // 发生时间（可为 null）
    private Boolean showTime;         // 时间展示精度：true-日期和时间 false-仅日期
    private String location;          // 地点
    private String coverImage;        // 封面图
    private String tagLabel;          // 标签文字
    private String tagColor;          // 标签颜色
    private Boolean isMilestone;      // 是否里程碑
}
