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
public class SpaceMemberVO {

    private String amourId;

    private String displayName;

    private String avatar;

    /**
     * 成员身份：1-空间发起人 2-另一半
     */
    private Integer memberRole;

    private String roleText;

    private LocalDateTime joinedAt;
}
