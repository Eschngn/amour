package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;

/**
 * 用户端新增/编辑故事章节。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryChapterSaveReqVO {

    /**
     * 为空表示新增，否则表示编辑当前空间内的章节。
     */
    private Long id;

    @Size(max = 50, message = "章节名称不能超过 50 个字符")
    private String name;

    @Size(max = 20, message = "章节主题色格式不正确")
    private String colorCode;

    private Integer sortOrder;

    private Boolean isVisible;
}
