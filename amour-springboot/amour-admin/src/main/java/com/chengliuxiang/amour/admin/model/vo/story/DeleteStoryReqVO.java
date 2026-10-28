package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class DeleteStoryReqVO {

    @NotNull(message = "故事ID不能为空")
    private String id;
}
