package com.chengliuxiang.amour.web.model.vo.gallery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 恋爱广场公开纪念日。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryAnniversaryVO {

    private Long anniversaryId;

    private String title;

    private String description;

    private LocalDate anniversaryDate;

    private Integer repeatType;

    private String category;

    private String colorCode;

    private String location;
}
