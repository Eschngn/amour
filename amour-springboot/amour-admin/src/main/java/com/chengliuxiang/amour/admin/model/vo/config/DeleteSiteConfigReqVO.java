package com.chengliuxiang.amour.admin.model.vo.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteSiteConfigReqVO {
    @NotNull(message = "配置ID不能为空")
    private String id;
}
