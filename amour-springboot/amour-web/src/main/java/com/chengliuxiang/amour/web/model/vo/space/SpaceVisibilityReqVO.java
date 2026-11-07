package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

/**
 * 空间整体公开/隐藏请求参数。
 *
 * <p>只接受 visibility 一个字段；目标空间由当前登录用户的成员关系推导，
 * 客户端夹带的 spaceId / userId 会被忽略。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceVisibilityReqVO {

    /**
     * 空间可见性：0-私密 1-公开到恋爱广场。
     */
    @NotNull(message = "可见性不能为空")
    @Min(value = 0, message = "可见性只能是 0 或 1")
    @Max(value = 1, message = "可见性只能是 0 或 1")
    private Integer visibility;
}
