package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 后台展示的空间历史成员公开资料。
 *
 * <p>只包含后台需要的 amourId / displayName / 头像与成员状态，不返回内部 userId。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceMemberVO {

    private Integer memberRole;

    private String roleText;

    private String amourId;

    private String displayName;

    private String avatar;

    /**
     * 成员状态：0-邀请中 1-有效 2-暂停 3-已退出 4-已移除。
     */
    private Integer status;

    private String statusText;

    private String joinedAt;

    /**
     * 退出时间；双方解绑后两名成员都应有值。
     */
    private String leftAt;
}
