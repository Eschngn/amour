package com.chengliuxiang.amour.web.model.vo.photo;

import com.chengliuxiang.amour.web.model.vo.space.SortOrderItemVO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.NotEmpty;
import java.util.List;

/**
 * 相册分类批量排序：分类属于空间级全局排序。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoCategoryOrderReqVO {

    @Valid
    @NotEmpty(message = "排序数据不能为空")
    private List<SortOrderItemVO> items;
}
