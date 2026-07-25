package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoCategoryListRspVO {

    private Long id;
    private String categoryName;
    private Integer sortOrder;
    private Boolean isEnabled;
}
