package com.chengliuxiang.amour.admin.model.vo.anniversary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAnniversaryVisibleStatusReqVO {
    @NotNull(message = "纪念日ID不能为空")
    private Long id;

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;

    private Integer visibility;

    /**
     * @deprecated 请使用 visibility
     */
    @Deprecated
    private Boolean isVisible;

    @NotBlank(message = "请填写操作原因")
    private String reason;
}
