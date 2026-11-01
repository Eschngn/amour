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
public class InvitationVO {

    private Long invitationId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private String inviterAmourId;

    private String inviterName;

    private String inviteeAmourId;

    private String inviteeName;

    /**
     * 邀请状态：0-待接受 1-已接受 2-已撤销 3-已过期 4-已拒绝
     */
    private Integer status;

    private String statusText;

    private LocalDateTime expiresAt;

    private LocalDateTime acceptedAt;

    private LocalDateTime createTime;
}
