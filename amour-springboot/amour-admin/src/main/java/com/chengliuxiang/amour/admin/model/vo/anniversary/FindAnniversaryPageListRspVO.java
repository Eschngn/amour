package com.chengliuxiang.amour.admin.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindAnniversaryPageListRspVO {
    private Long id;
    private String title;
    private String description;
    private LocalDate anniversaryDate;
    private Integer repeatType;
    private String category;
    private String colorCode;
    private String location;
    private Integer sortOrder;
    private Boolean isVisible;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
