package com.chengliuxiang.amour.web.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnniversaryVO {

    private Long id;

    private String title;

    private String description;

    private LocalDate anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private String location;

    private Integer sortOrder;

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏（管理视图使用）。
     */
    private Integer visibility;
}
