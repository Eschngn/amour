package com.chengliuxiang.amour.web.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationPreviewVO {

    private Long invitationId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private String description;

    private String coverImage;

    private String inviterAmourId;

    private String inviterName;

    /**
     * 邀请状态：0-待接受 1-已接受 2-已撤销 3-已过期 4-已拒绝
     */
    private Integer status;

    private String statusText;

    private Integer spaceStatus;

    private Integer memberCount;

    private Integer memberLimit;

    private LocalDateTime expiresAt;

    private Boolean needLogin;

    /**
     * 邀请是否指定了受邀账号。
     */
    private Boolean inviteeRestricted;

    /**
     * 当前登录账号是否匹配受邀账号，未登录时为 null。
     */
    private Boolean inviteeMatched;

    private Boolean alreadyMember;

    private Boolean inOtherSpace;

    /**
     * 当前是否可接受邀请。
     */
    private Boolean joinable;

    /**
     * 不可接受时的原因说明。
     */
    private String message;
}
