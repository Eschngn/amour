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

    private String location;

    private Integer sortOrder;

    private Boolean cover;
}
