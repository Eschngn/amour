package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateStoryReqVO {

    @NotNull(message = "故事ID不能为空")
    private Long id;

    @NotBlank(message = "故事标题不能为空")
    private String title;

    private String summary;

    private LocalDateTime happenedTime;

    private String location;

    private String tagLabel;

    private String tagColor;

    private Integer sortOrder;

    @NotNull(message = "所属章节不能为空")
    private Long chapterId;

    @NotNull(message = "是否里程碑不能为空")
    private Boolean isMilestone;

    @NotBlank(message = "故事内容不能为空")
    private String content;

    @NotBlank(message = "故事封面不能为空")
    private String coverImage;
}
