package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindPhotoPageListRspVO {

    private Long id;
    private String title;
    private String description;
    private Long photoCategoryId;
    private String categoryName;
    private String url;
    private LocalDateTime takenTime;
    private String location;
    private Integer sortOrder;
    private Boolean isCover;
    private Boolean isVisible;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
