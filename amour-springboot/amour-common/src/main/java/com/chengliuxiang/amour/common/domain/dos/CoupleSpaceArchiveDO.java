package com.chengliuxiang.amour.common.domain.dos;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 情侣空间销毁留档。
 *
 * <p>创建者在「另一半尚未加入」时销毁空间，会写入一条完整快照：
 * 空间资料、成员关系、空间配置、故事/章节/图片、相册分类/照片、纪念日、
 * 留言及回复，以及公开审核与已发布版本等关联数据。空间与业务数据本身不做物理删除，
 * 只在 {@code couple_space.status} 上标记销毁状态；只有平台管理员可以从本留档恢复。</p>
 *
 * <p>快照只保存业务字段，不保存密码、openid、邀请明文 token 或任何密钥。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("couple_space_archive")
public class CoupleSpaceArchiveDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    /**
     * 同一空间的第几次销毁留档。恢复后再次销毁会写入新一轮留档。
     */
    private Integer archiveRound;

    private String spaceCode;

    private String spaceName;

    /**
     * 销毁前的空间状态，当前只允许 0（等待绑定）。
     */
    private Integer statusBefore;

    private Integer visibilityBefore;

    /**
     * 空间创建者用户 ID，必须与销毁操作者一致。
     */
    private Long creatorUserId;

    /**
     * 销毁操作者用户 ID（仅允许创建者本人）。
     */
    private Long destroyedBy;

    private LocalDateTime destroyedAt;

    /**
     * 快照结构版本，便于后续兼容升级。
     */
    private Integer snapshotVersion;

    /**
     * 完整快照 JSON，包含空间全部依赖业务数据。
     */
    private String snapshotJson;

    private Integer memberCount;

    private Integer storyCount;

    private Integer photoCount;

    private Integer messageCount;

    private Integer anniversaryCount;

    /**
     * 快照中保留的图片资源引用数量（头像、封面、故事图片、照片等 URL）。
     * 留档不删除对象存储文件，只保留可恢复的引用。
     */
    private Integer fileResourceCount;

    /**
     * 管理员从本留档恢复的时间；为空表示尚未恢复。
     */
    private LocalDateTime restoredAt;

    private Long restoredBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
