package com.chengliuxiang.amour.admin.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAnniversaryReqVO {
    @NotNull(message = "纪念日ID不能为空")
    private Long id;
    @NotBlank(message = "纪念日标题不能为空")
    private String title;
    private String description;
    @NotNull(message = "纪念日期不能为空")
    private LocalDate anniversaryDate;
    @NotNull(message = "重复类型不能为空")
    private Integer repeatType;
    @NotBlank(message = "纪念日分类不能为空")
    private String category;
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "卡片颜色格式不正确")
    private String colorCode;
    private String location;
    private Integer sortOrder;
    private Boolean isVisible;
}
