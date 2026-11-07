package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户端相册管理照片数据（包含隐藏照片）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoManageItemVO {

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

    /**
     * 可见性：0-仅空间成员 1-公开到恋爱广场 2-隐藏。
     */
    private Integer visibility;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
