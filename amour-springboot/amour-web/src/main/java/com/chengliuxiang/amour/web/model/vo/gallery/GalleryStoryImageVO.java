package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 恋爱广场公开故事图片。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryStoryImageVO {

    private String url;

    private String altText;
}
