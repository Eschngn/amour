package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class MilestoneStoryNodeVO {

    private Long id;
    private String title;
    private String summary;
    private LocalDateTime happenedTime;
    private String coverImage;
}
