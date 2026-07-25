package com.chengliuxiang.amour.admin.model.vo.photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddPhotoReqVO {

    @NotBlank(message = "照片标题不能为空")
    @Size(max = 100, message = "照片标题不能超过100个字符")
    private String title;

    @Size(max = 1000, message = "照片描述不能超过1000个字符")
    private String description;

    @NotNull(message = "照片分类不能为空")
    private Long photoCategoryId;

    @NotBlank(message = "照片地址不能为空")
    @Size(max = 500, message = "照片地址不能超过500个字符")
    private String url;

    private LocalDateTime takenTime;

    @Size(max = 100, message = "拍摄地点不能超过100个字符")
    private String location;

    private Integer sortOrder;
    private Boolean isCover;
    private Boolean isVisible;
}
