package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoCategoryVO {

    private Long id;

    private String categoryName;

    private Integer sortOrder;

    /**
     * 管理视图使用：是否启用与备注。前台展示接口仍只返回基础字段。
     */
    private Boolean isEnabled;

    private String remark;
}
