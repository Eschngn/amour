package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateStoryVisibleStatusReqVO {

    @NotNull(message = "故事ID不能为空")
    private String id;

    @NotNull(message = "显示状态不能为空")
    private Boolean isVisible;
}
