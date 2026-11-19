package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 恋爱广场公开照片。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryPhotoVO {

    private Long photoId;

    private String title;

    private String description;

    private String url;

    private LocalDateTime takenTime;

    /** 时间展示精度：false 表示仅展示日期。 */
    private Boolean showTime;

    private String location;

    private Boolean isCover;
}
