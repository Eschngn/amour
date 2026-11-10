package com.chengliuxiang.amour.admin.model.vo.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateStoryVisibleStatusReqVO {

    @NotNull(message = "故事ID不能为空")
    private Long id;

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;

    /**
     * 0-仅空间成员 1-公开 2-隐藏
     */
    private Integer visibility;

    /**
     * 兼容旧接口：仅在未传 visibility 时使用；true 映射为成员可见，false 映射为隐藏。
     *
     * @deprecated 请传 visibility
     */
    @Deprecated
    private Boolean isVisible;

    @NotBlank(message = "请填写操作原因")
    private String reason;
}
