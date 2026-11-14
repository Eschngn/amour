package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.Data;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 项级审核请求：只处理指定提交下的一个审核项。
 *
 * <p>itemType 为 STORY / PHOTO / ANNIVERSARY / SPACE / HOME_CONFIG，
 * itemId 对应内容主键；SPACE 与 HOME_CONFIG 固定为 0。</p>
 */
@Data
public class AdminSpaceReviewItemReqVO {

    @NotNull(message = "审核提交ID不能为空")
    private Long submissionId;

    @NotNull(message = "审核项类型不能为空")
    private String itemType;

    @NotNull(message = "审核项ID不能为空")
    private Long itemId;

    /**
     * 项级驳回原因必填，由 service 统一校验并限制 500 字。
     */
    @Size(max = 500, message = "审核说明不能超过500字")
    private String reason;
}
