package com.chengliuxiang.amour.admin.model.vo.space;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSpaceDetailRspVO {

    private Long spaceId;

    private String spaceCode;

    private String spaceName;

    private String description;

    private String coverImage;

    private Integer status;

    private String statusText;

    private Integer visibility;

    private String visibilityText;

    private String loveStartTime;

    private String publicAt;

    private String archivedAt;

    private String deleteAfter;

    private String deletedAt;

    private String createTime;

    private String updateTime;

    private Integer memberCount;

    private Integer activeMemberCount;

    private Long storyCount;

    private Long photoCount;

    private Long messageCount;

    private Long anniversaryCount;

    private Long publicStoryCount;

    private Long publicPhotoCount;

    private Long publicAnniversaryCount;

    private Long contentCount;

    private List<AdminSpaceMemberVO> members;

    private List<AdminSpaceInvitationVO> invitations;

    private List<AdminSpaceLifecycleEventVO> timeline;

    private List<AdminSpaceContentItemVO> stories;

    private List<AdminSpaceContentItemVO> photos;

    private List<AdminSpaceContentItemVO> messages;

    private List<AdminSpaceContentItemVO> anniversaries;

    private AdminSpaceUnbindSummaryVO unbind;

    private AdminSpaceRestoreSummaryVO restore;
}
