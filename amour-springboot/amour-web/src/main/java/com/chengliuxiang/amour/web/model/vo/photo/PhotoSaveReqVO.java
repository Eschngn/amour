package com.chengliuxiang.amour.web.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * 用户端新增/编辑照片。
 *
 * <p>visibility 不传时默认仅空间成员可见；显式传 1 需要空间已完成两人绑定。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoSaveReqVO {

    private Long id;

    private Long photoCategoryId;

    @Size(max = 100, message = "照片标题不能超过 100 个字符")
    private String title;

    @Size(max = 500, message = "照片描述不能超过 500 个字符")
    private String description;

    @Size(max = 500, message = "图片地址不能超过 500 个字符")
    private String url;

    private LocalDateTime takenTime;

    /**
     * 时间展示精度：true-展示日期和时间 false-仅展示日期。
     * 编辑时不传表示保留原记录选项；新建时不传默认 true。
     */
    private Boolean showTime;

    @Size(max = 100, message = "拍摄地点不能超过 100 个字符")
    private String location;

    private Integer sortOrder;

    private Boolean isCover;

    private Integer visibility;
}
