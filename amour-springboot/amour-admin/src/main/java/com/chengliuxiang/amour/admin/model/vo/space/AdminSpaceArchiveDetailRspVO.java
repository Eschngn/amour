package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 后台销毁留档详情。
 *
 * <p>用于管理员确认目标空间、留档完整性、恢复资格与冲突情况。
 * 只返回数量与索引级摘要，不返回故事正文、留言正文等不必要的敏感内容。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceArchiveDetailRspVO {

    private Long archiveId;

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private String description;

    private Integer archiveRound;

    private Integer statusBefore;

    private String statusBeforeText;

    private Integer visibilityBefore;

    private String visibilityBeforeText;

    private Integer snapshotVersion;

    private String destroyedAt;

    private String restoredAt;

    private String destroyedByAmourId;

    private String destroyedByDisplayName;

    private String creatorAmourId;

    private String creatorDisplayName;

    /**
     * 当前空间真实状态（可能已被恢复或被其他流程改写）。
     */
    private Integer currentSpaceStatus;

    private String currentSpaceStatusText;

    private Boolean spaceDestroyed;

    private Boolean restorable;

    private String restoreBlockReason;

    /**
     * 留档内容数量。
     */
    private Long memberCount;

    private Long storyCount;

    private Long photoCount;

    private Long messageCount;

    private Long anniversaryCount;

    private Long storyChapterCount;

    private Long photoCategoryCount;

    private Long storyImageCount;

    private Long messageReplyCount;

    private Long configCount;

    private Long reviewSubmissionCount;

    private Long publishedItemCount;

    /**
     * 图片资源引用数量（封面、故事封面、故事图片、照片、主页配置图片）。
     * 留档期间这些资源不删除，恢复后仍可按原引用访问。
     */
    private Integer fileResourceCount;

    private List<AdminSpaceArchiveConflictVO> conflicts;

    /**
     * 留档中保留的历史成员（只含公开资料与角色，不含 userId）。
     */
    private List<AdminSpaceMemberVO> members;

    /**
     * 留档中的生命周期摘要（销毁前状态、销毁时间等）。
     */
    private List<AdminSpaceLifecycleEventVO> timeline;
}
