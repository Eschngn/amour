package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

/**
 * 单条排序项：只允许携带内容 ID 与目标排序值，禁止通过排序接口修改其他业务字段。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SortOrderItemVO {

    @NotNull(message = "内容 ID 不能为空")
    private Long id;

    /**
     * 目标排序值；为空时按提交顺序排在最后。
     * 服务端最终会统一规范化为 10、20、30 递增，不直接信任该值。
     */
    private Integer sortOrder;
}
