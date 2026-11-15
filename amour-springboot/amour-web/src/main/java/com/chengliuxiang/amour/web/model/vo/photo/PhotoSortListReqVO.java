package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 照片排序模式数据查询：一次返回完整列表，避免只对当前分页排序。
 *
 * <p>categoryId 为空时返回全部照片（全局排序），否则只返回该分类的照片（分类内排序）。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoSortListReqVO {

    private Long categoryId;
}
