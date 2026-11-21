package com.chengliuxiang.amour.admin.model.vo.chapter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FindChapterListRspVO {
    private Long id;
    private Long spaceId;
    private String name;
    private Integer sortOrder;
    private Boolean isVisible;
}
