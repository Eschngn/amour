package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 空间内容索引项。只包含识别和治理所需字段，不返回完整正文。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceContentItemVO {

    private String contentType;

    private String contentTypeText;

    private Long contentId;

    private String title;

    private String chapterOrCategory;

    private Integer visibility;

    private String visibilityText;

    private Boolean deleted;

    private String authorAmourId;

    private String authorName;

    private String happenedTime;

    private String createTime;

    private String updateTime;
}
