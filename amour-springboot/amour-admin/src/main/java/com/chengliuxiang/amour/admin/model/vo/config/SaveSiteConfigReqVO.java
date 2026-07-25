package com.chengliuxiang.amour.admin.model.vo.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveSiteConfigReqVO {
    private Long id;

    @NotBlank(message = "配置键不能为空")
    @Size(max = 64, message = "配置键不能超过64个字符")
    private String configKey;

    @NotBlank(message = "配置名称不能为空")
    @Size(max = 64, message = "配置名称不能超过64个字符")
    private String configName;

    @NotNull(message = "配置值不能为空")
    private String configValue;

    @NotBlank(message = "值类型不能为空")
    @Size(max = 20, message = "值类型不能超过20个字符")
    private String valueType;

    private Integer sortOrder;

    @Size(max = 255, message = "备注不能超过255个字符")
    private String remark;
}
