package com.chengliuxiang.amour.web.model.vo.photo;

import com.chengliuxiang.amour.web.model.vo.space.SortOrderItemVO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import java.util.List;

/**
 * 照片全局排序：不区分分类，按提交顺序重排全部照片。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoGlobalOrderReqVO {

    @Valid
    private List<SortOrderItemVO> items;
}
