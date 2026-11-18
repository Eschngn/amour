package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 后台「已销毁空间留档」列表项。
 *
 * <p>只展示管理员确认目标空间所需的最小信息：空间标识、销毁时间、创建者公开资料、
 * 内容数量与恢复资格。不返回故事正文、留言内容或任何敏感字段。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceArchivePageRspVO {

    private Long archiveId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private Integer archiveRound;

    private Integer statusBefore;

    private String statusBeforeText;

    private Integer visibilityBefore;

    private String destroyedAt;

    private String restoredAt;

    private Long archiveMemberCount;

    private Long archiveStoryCount;

    private Long archivePhotoCount;

    private Long archiveMessageCount;

    private Long archiveAnniversaryCount;

    /**
     * 留档中保留的图片资源引用数量；销毁不会触发对象存储清理。
     */
    private Integer fileResourceCount;

    /**
     * 销毁操作者的公开资料（amourId / displayName），不含内部 userId。
     */
    private String destroyedByAmourId;

    private String destroyedByDisplayName;

    /**
     * 空间创建者的公开资料。
     */
    private String creatorAmourId;

    private String creatorDisplayName;

    /**
     * 当前空间是否仍处于「已销毁」状态；false 表示已被恢复或被其他流程改写。
     */
    private Boolean spaceDestroyed;

    /**
     * 是否可以安全地从留档恢复。
     */
    private Boolean restorable;

    /**
     * 不可恢复时的明确原因；可恢复时为空字符串。
     */
    private String restoreBlockReason;

    /**
     * 恢复冲突列表（成员已加入其他空间、主键冲突等）。
     */
    private List<AdminSpaceArchiveConflictVO> conflicts;

    /**
     * 是否可以查询留档详情（与查询权限一致，前端按钮显隐用）。
     */
    private Boolean canRestore;
}
