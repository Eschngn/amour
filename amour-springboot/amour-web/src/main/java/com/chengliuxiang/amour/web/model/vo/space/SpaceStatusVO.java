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
     * 空间状态：0-等待绑定 1-正常 2-冻结 3-已归档 4-删除等待期 5-已删除
     */
    private Integer status;

    private String statusText;

    /**
     * 空间可见性：0-私密 1-公开到恋爱广场
     */
    private Integer visibility;

    private LocalDateTime loveStartTime;

    private LocalDateTime archivedAt;

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
}
