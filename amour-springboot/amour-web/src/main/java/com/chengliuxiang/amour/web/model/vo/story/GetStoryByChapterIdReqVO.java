package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

@AllArgsConstructor
@Data
@NoArgsConstructor
@Builder
public class GetStoryByChapterIdReqVO {
    @NotBlank(message = "章节 ID 不能为空")
    private String chapterId;
}
