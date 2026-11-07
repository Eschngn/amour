package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceStatusVO {

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private String description;

    private String coverImage;

    /**
     * 空间状态：0-等待绑定 1-正常 2-冻结 3-历史归档 4-删除等待期 5-已解绑（逻辑删除）
     */
    private Integer status;

    private String statusText;

    /**
     * 空间可见性：0-私密 1-公开到恋爱广场
     */
    private Integer visibility;

    private LocalDateTime loveStartTime;

    /**
     * 首次公开时间，隐藏、恢复或再次公开都不会刷新。
     */
    private LocalDateTime publicAt;

    /**
     * 当前是否具备公开资格：status=1 且有效成员数为 2。
     */
    private Boolean canSetVisibility;

    private LocalDateTime archivedAt;

    /**
     * 完成解绑（逻辑删除）时间，仅 status=5 的历史数据可能有值。
     */
    private LocalDateTime deletedAt;

    private LocalDateTime createTime;

    private Integer memberLimit;

    private Integer memberCount;

    /**
     * 当前用户在空间中的身份，未加入时为 null。
     */
    private Integer currentUserRole;

    private Boolean creator;

    /**
     * 是否允许继续创建邀请。
     */
    private Boolean canInvite;

    private Integer pendingInvitationCount;

    /**
     * 冻结或归档后是否需要双方确认恢复。
     */
    private Boolean restoreRequired;

    private Integer restoreConfirmedCount;

    private Boolean restoreConfirmedByMe;

    private List<SpaceMemberVO> members;

    /**
     * 是否存在待处理的解绑申请。
     */
    private Boolean unbindPending;

    /**
     * 待处理解绑申请是否由当前用户发起。
     */
    private Boolean unbindRequestedByMe;

    /**
     * 当前用户是否可以确认该解绑申请：存在待处理申请且当前用户是另一名有效成员。
     */
    private Boolean unbindCanConfirm;

    /**
     * 当前用户是否可以取消该解绑申请：存在待处理申请且当前用户是发起人。
     */
    private Boolean unbindCanCancel;

    /**
     * 解绑发起人的公开资料（amourId / displayName / avatar），不返回内部 userId。
     */
    private SpaceUnbindRequesterVO unbindRequester;

    /**
     * 解绑申请发起时间。
     */
    private LocalDateTime unbindRequestedAt;

    /**
     * 当前待处理解绑申请 ID，用于前端按“单条申请”记住是否不再弹窗提示；没有待处理申请时为 null。
     */
    private Long unbindRequestId;

    /**
     * 最近一次已结束的解绑申请状态：1-已同意 2-已拒绝 3-已取消；没有历史记录时为 null。
     * 只在没有待处理申请时返回，避免与 unbindPending 同时出现造成歧义。
     */
    private Integer unbindLastStatus;

    /**
     * 最近一次已结束的解绑申请是否由当前用户发起。
     */
    private Boolean unbindLastRequestedByMe;

    /**
     * 最近一次已结束解绑申请的处理时间。
     */
    private LocalDateTime unbindLastResolvedAt;
}
