package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoPageItemVO {

    private Long id;

    private String title;

    private String description;

    private Long photoCategoryId;

    private String categoryName;

    private String url;

    private LocalDateTime takenTime;

    /** 时间展示精度：true-日期和时间 false-仅日期。 */
    private Boolean showTime;

    private String location;
}
