package com.chengliuxiang.amour.admin.model.vo.spacereview;

import lombok.Data;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 管理员下架公开内容或暂停空间公开。
 *
 * <p>contentType/contentId 为空时下架整个空间；只影响公开快照，
 * 不删除成员可见数据。</p>
 */
@Data
public class AdminSpaceReviewUnpublishReqVO {

    @NotNull(message = "空间ID不能为空")
    private Long spaceId;

    /**
     * story / photo / anniversary；为空表示整个空间。
     */
    private String contentType;

    private Long contentId;

    @Size(max = 500, message = "操作原因不能超过500字")
    private String reason;
}
