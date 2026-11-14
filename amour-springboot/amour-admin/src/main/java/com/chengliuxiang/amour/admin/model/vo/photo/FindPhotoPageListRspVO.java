package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindPhotoPageListRspVO {

    private Long id;
    private Long spaceId;
    private String spaceCode;
    private String spaceName;
    private Integer spaceStatus;
    private Integer spaceVisibility;
    private String title;
    private String description;
    private Long photoCategoryId;
    private String categoryName;
    private String url;
    private String takenTime;
    private String location;
    private Integer sortOrder;
    private Boolean isCover;
    private Integer visibility;
    private String visibilityText;
    private Boolean deleted;
    private String authorAmourId;
    private String authorName;
    /**
     * @deprecated 请使用 visibility
     */
    @Deprecated
    private Boolean isVisible;
    private String createTime;
    private String updateTime;
}
