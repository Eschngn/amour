package com.chengliuxiang.amour.web.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户端新增/编辑故事节点。
 *
 * <p>visibility 不传时默认仅空间成员可见；显式传 1 需要空间已完成两人绑定。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryNodeSaveReqVO {

    private Long id;

    private Long chapterId;

    @Size(max = 100, message = "故事标题不能超过 100 个字符")
    private String title;

    @Size(max = 500, message = "故事摘要不能超过 500 个字符")
    private String summary;

    @Size(max = 20000, message = "故事正文不能超过 20000 个字符")
    private String content;

    private LocalDateTime happenedTime;

    @Size(max = 100, message = "故事地点不能超过 100 个字符")
    private String location;

    @Size(max = 500, message = "封面地址不能超过 500 个字符")
    private String coverImage;

    @Size(max = 30, message = "标签不能超过 30 个字符")
    private String tagLabel;

    @Size(max = 20, message = "标签颜色格式不正确")
    private String tagColor;

    private Integer sortOrder;

    private Boolean isMilestone;

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏。
     */
    private Integer visibility;

    @Valid
    @Size(max = 20, message = "故事图片不能超过 20 张")
    private List<ImageReqVO> images;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageReqVO {

        @Size(max = 500, message = "图片地址不能超过 500 个字符")
        private String url;

        @Size(max = 100, message = "图片描述不能超过 100 个字符")
        private String altText;

        private Integer sortOrder;
    }
}
