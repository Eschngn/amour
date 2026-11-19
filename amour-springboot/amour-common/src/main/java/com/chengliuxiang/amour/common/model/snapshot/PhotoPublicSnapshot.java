package com.chengliuxiang.amour.common.model.snapshot;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 照片公开快照。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoPublicSnapshot {

    private Long photoId;

    private Long photoCategoryId;

    private String categoryName;

    private String title;

    private String description;

    private String url;

    private String takenTime;

    /** 时间展示精度：历史快照缺失时按 true（展示日期和时间）兼容。 */
    private Boolean showTime;

    private String location;

    private Integer sortOrder;

    private Boolean cover;
}
