package com.chengliuxiang.amour.common.model.snapshot;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class AnniversaryPublicSnapshot {

    private Long anniversaryId;

    private String title;

    private String description;

    private String anniversaryDate;

    private Integer repeatType;

    private String category;

    private String location;

    private Integer sortOrder;
}
