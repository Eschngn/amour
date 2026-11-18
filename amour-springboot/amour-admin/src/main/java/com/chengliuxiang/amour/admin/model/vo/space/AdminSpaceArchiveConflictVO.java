package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 从留档恢复前检测到的冲突项。
 *
 * <p>冲突只描述、不自动处理：管理员必须先解决冲突，系统不会静默覆盖现存数据。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceArchiveConflictVO {

    /**
     * 冲突类型：
     * MEMBER_IN_OTHER_SPACE-成员已加入其它未销毁空间；
     * SPACE_CODE_OCCUPIED-空间标识被占用；
     * CONTENT_KEY_CONFLICT-内容主键或唯一键冲突；
     * SPACE_STATUS_CHANGED-空间已不在「已销毁」状态。
     */
    private String type;

    private String typeText;

    /**
     * 冲突的其它空间 ID（如成员已加入的空间）。
     */
    private Long conflictSpaceId;

    private String conflictSpaceCode;

    private String conflictSpaceName;

    private Integer conflictSpaceStatus;

    private String conflictSpaceStatusText;

    /**
     * 冲突涉及的用户公开标识（恋语 ID）。
     */
    private String memberAmourId;

    /**
     * 可读的冲突说明。
     */
    private String message;
}
