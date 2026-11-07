package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;

/**
 * 用户端相册分类新增/编辑。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoCategorySaveReqVO {

    private Long id;

    @Size(max = 50, message = "分类名称不能超过 50 个字符")
    private String categoryName;

    private Integer sortOrder;

    private Boolean isEnabled;

    @Size(max = 200, message = "分类备注不能超过 200 个字符")
    private String remark;
}
