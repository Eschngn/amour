package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 恋爱广场公开空间详情中的故事列表项。
 *
 * <p>列表项只包含摘要信息，不返回完整正文；
 * 完整正文由 {@code POST /gallery/space/story/detail} 按需读取。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryStoryListItemVO {

    private Long storyId;

    private String title;

    /** 用户填写的摘要，可能为空。 */
    private String summary;

    /** 去除 Markdown 标记后的正文预览，最多 {@link com.chengliuxiang.amour.web.utils.GalleryStoryPreviewUtil#DEFAULT_PREVIEW_LENGTH} 个字符。 */
    private String contentPreview;

    /** 去除空白后的正文长度。 */
    private Integer contentLength;

    /** 正文是否为空。 */
    private Boolean hasContent;

    private LocalDateTime happenedTime;

    /** 时间展示精度：false 表示仅展示日期。 */
    private Boolean showTime;

    private String location;

    private String coverImage;

    private String tagLabel;

    private String tagColor;

    private Boolean isMilestone;
}
