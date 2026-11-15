package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 照片排序模式的轻量列表项：只保留识别与展示所需字段。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoSortItemVO {

    private Long id;

    private Long photoCategoryId;

    private String title;

    private String url;

    private LocalDateTime takenTime;

    /** 分类内排序值。 */
    private Integer sortOrder;

    /** 跨分类的全局排序值。 */
    private Integer globalSortOrder;
}
