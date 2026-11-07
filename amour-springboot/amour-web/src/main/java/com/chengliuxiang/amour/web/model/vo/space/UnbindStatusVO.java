package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 解绑申请状态。
 *
 * <p>只返回公开信息：申请方使用 amourId / displayName / avatar 描述，不返回内部 userId。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnbindStatusVO {

    /**
     * 解绑申请ID，未产生申请时为 null。
     */
    private Long requestId;

    private Long spaceId;

    /**
     * 申请状态：0-待同意 1-已同意 2-已拒绝 3-已取消
     */
    private Integer status;

    private String statusText;

    /**
     * 当前解绑申请是否仍待处理。
     */
    private Boolean pending;

    /**
     * 当前解绑申请是否由当前用户发起。
     */
    private Boolean requestedByMe;

    /**
     * 当前用户是否可以确认该申请（仅另一名有效成员可确认）。
     */
    private Boolean canConfirm;

    /**
     * 当前用户是否可以取消该申请（仅发起人可取消）。
     */
    private Boolean canCancel;

    private SpaceUnbindRequesterVO requester;

    private LocalDateTime requestedAt;

    private LocalDateTime resolvedAt;
}
