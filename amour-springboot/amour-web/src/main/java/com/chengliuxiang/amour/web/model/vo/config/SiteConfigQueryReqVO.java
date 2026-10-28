package com.chengliuxiang.amour.web.model.vo.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteConfigQueryReqVO {

    @NotBlank(message = "配置键不能为空")
    @Size(max = 64, message = "配置键长度不能超过64个字符")
    private String configKey;
}
