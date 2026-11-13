package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 人工恢复前检测到的冲突空间。
 *
 * <p>只暴露后台排障需要的公开字段，不返回成员内部 userId、密码、openid 或邀请 token。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceRestoreConflictVO {

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private Integer status;

    private String statusText;

    private Integer activeMemberCount;

    /**
     * 是否满足「等待绑定 + 仅该历史成员一人有效」，可在恢复时安全关闭。
     */
    private Boolean autoClosable;

    /**
     * 不能自动关闭时的原因；可自动关闭时为空字符串。
     */
    private String blockReason;
}
