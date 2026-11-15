package com.chengliuxiang.amour.web.model.vo.photo;

import com.chengliuxiang.amour.web.model.vo.space.SortOrderItemVO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.List;

/**
 * 照片批量排序：必须指定分类，只允许调整该分类内部的照片顺序。
 *
 * <p>items 允许为空：空列表表示无需调整，接口直接返回当前分类顺序。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoOrderReqVO {

    @NotNull(message = "分类 ID 不能为空")
    private Long categoryId;

    @Valid
    private List<SortOrderItemVO> items;
}
