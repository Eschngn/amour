package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class FindStoryPageListRspVO {
    private Long id;
    private String title;
    private String summary;
    private String coverImage;
    private Boolean isVisible;
    private String chapterId;
    private String chapterName;
    private String happenedTime;
}
