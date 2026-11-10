package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class DeleteStoryReqVO {

    @NotNull(message = "故事ID不能为空")
    private Long id;

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;

    @NotBlank(message = "请填写删除原因")
    private String reason;
}
