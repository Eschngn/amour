package com.chengliuxiang.amour.admin.model.vo.story;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.*;

@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class FindStoryPageListReqVO extends BasePageQuery {
    private Long spaceId;
    private String title;
    private Integer visibility;
    private Boolean includeDeleted;
}
