package com.chengliuxiang.amour.admin.model.vo.anniversary;

import com.chengliuxiang.amour.common.model.BasePageQuery;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class FindAnniversaryPageListReqVO extends BasePageQuery {
    private Long spaceId;
    private String title;
    private String category;
    private Integer repeatType;
    private Integer visibility;
    private Boolean includeDeleted;
    /**
     * @deprecated 请使用 visibility
     */
    @Deprecated
    private Boolean isVisible;
}
