package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.Data;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 驳回空间审核。驳回原因必填，并会展示给空间成员。
 *
 * <p>不传 itemType/itemId 时驳回整个待审核提交，保持旧接口兼容；
 * 传入时只驳回该待审核项，不要调用下架接口处理未公开内容。</p>
 *
 * <p>原因是否为空仍由 service 抛出 REASON_REQUIRED，
 * 这里只限制最大长度，避免改变既有错误码语义。</p>
 */
@Data
public class AdminSpaceReviewRejectReqVO {

    @NotNull(message = "审核提交ID不能为空")
    private Long submissionId;

    @Size(max = 500, message = "驳回原因不能超过500字")
    private String reason;

    /**
     * 可选：STORY / PHOTO / ANNIVERSARY / SPACE / HOME_CONFIG。
     */
    private String itemType;

    private Long itemId;
}
