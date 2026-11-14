package com.chengliuxiang.amour.common.model.snapshot;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 纪念日公开快照。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnniversaryPublicSnapshot {

    private Long anniversaryId;

    private String title;

    private String description;

    private String anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private String location;

    private Integer sortOrder;
}
