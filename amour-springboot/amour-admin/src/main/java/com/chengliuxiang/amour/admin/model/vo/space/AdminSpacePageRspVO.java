package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 后台情侣空间分页列表项。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpacePageRspVO {

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private Integer status;

    private String statusText;

    private Integer visibility;

    private String visibilityText;

    /**
     * 完成解绑（status=5）时间。
     */
    private String deletedAt;

    private String createTime;

    /**
     * 当前保留的历史成员关系，正常空间为 2 条，双方解绑后也保留 2 条已退出记录。
     */
    private List<AdminSpaceMemberVO> members;

    /**
     * 历史成员关系总数。
     */
    private Integer memberCount;

    /**
     * 当前仍为有效状态（status=1）的成员数。
     */
    private Integer activeMemberCount;

    private Long storyCount;

    private Long photoCount;

    private Long messageCount;

    private Long anniversaryCount;

    /**
     * 内容总量：故事 + 照片 + 留言 + 纪念日。
     */
    private Long contentCount;

    /**
     * 是否满足后台人工恢复条件。
     */
    private Boolean restorable;

    /**
     * 不满足恢复条件时的明确原因；可恢复时为空字符串。
     */
    private String restoreBlockReason;
}
