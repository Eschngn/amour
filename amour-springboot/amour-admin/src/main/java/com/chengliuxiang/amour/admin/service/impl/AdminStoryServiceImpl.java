package com.chengliuxiang.amour.admin.service.impl;

import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDeleteReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentModerateReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.story.DeleteStoryReqVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.story.FindStoryPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.story.UpdateStoryVisibleStatusReqVO;
import com.chengliuxiang.amour.admin.service.AdminContentGovernanceService;
import com.chengliuxiang.amour.admin.service.AdminStoryService;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 旧 /admin/story/* 路径的兼容实现，业务规则统一委托给内容治理服务，
 * 不再提供代用户新增/编辑故事正文的入口。
 */
@Service
public class AdminStoryServiceImpl implements AdminStoryService {

    @Resource
    private AdminContentGovernanceService adminContentGovernanceService;

    @Override
    public Response<PageResult<FindStoryPageListRspVO>> findStoryPageList(FindStoryPageListReqVO reqVO) {
        AdminContentPageReqVO query = new AdminContentPageReqVO();
        query.setCurrent(reqVO.getCurrent());
        query.setSize(reqVO.getSize());
        query.setSpaceId(reqVO.getSpaceId());
        query.setKeyword(reqVO.getTitle());
        query.setVisibility(reqVO.getVisibility());
        query.setIncludeDeleted(reqVO.getIncludeDeleted());
        query.setContentType(ContentGovernanceConstants.TYPE_STORY);

        Response<PageResult<AdminContentPageRspVO>> response = adminContentGovernanceService.findPage(query);
        PageResult<AdminContentPageRspVO> page = response.getData();
        List<FindStoryPageListRspVO> records = page.getRecords().stream()
                .map(item -> FindStoryPageListRspVO.builder()
                        .id(item.getContentId())
                        .spaceId(item.getSpaceId())
                        .spaceCode(item.getSpaceCode())
                        .spaceName(item.getSpaceName())
                        .spaceStatus(item.getSpaceStatus())
                        .spaceVisibility(item.getSpaceVisibility())
                        .title(item.getTitle())
                        .summary(item.getSummary())
                        .coverImage(item.getCoverImage())
                        .visibility(item.getVisibility())
                        .visibilityText(item.getVisibilityText())
                        .deleted(item.getDeleted())
                        .isVisible(item.getVisibility() == null
                                || item.getVisibility() != ContentGovernanceConstants.VISIBILITY_HIDDEN)
                        .authorAmourId(item.getAuthorAmourId())
                        .authorName(item.getAuthorName())
                        .reportCount(item.getReportCount())
                        .pendingReportCount(item.getPendingReportCount())
                        .chapterId(item.getChapterId())
                        .chapterName(item.getChapterName())
                        .happenedTime(item.getHappenedTime())
                        .createTime(item.getCreateTime())
                        .updateTime(item.getUpdateTime())
                        .build())
                .collect(Collectors.toList());
        return Response.success(PageResult.<FindStoryPageListRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<FindStoryDetailRspVO> findStoryDetail(FindStoryDetailReqVO reqVO) {
        AdminContentDetailReqVO query = new AdminContentDetailReqVO();
        query.setContentType(ContentGovernanceConstants.TYPE_STORY);
        query.setContentId(reqVO.getId());
        query.setSpaceId(reqVO.getSpaceId());
        Response<AdminContentDetailRspVO> response = adminContentGovernanceService.findDetail(query);
        AdminContentDetailRspVO detail = response.getData();
        return Response.success(FindStoryDetailRspVO.builder()
                .id(detail.getContentId())
                .spaceId(detail.getSpaceId())
                .spaceCode(detail.getSpaceCode())
                .spaceName(detail.getSpaceName())
                .spaceStatus(detail.getSpaceStatus())
                .spaceStatusText(detail.getSpaceStatusText())
                .spaceVisibility(detail.getSpaceVisibility())
                .visibility(detail.getVisibility())
                .visibilityText(detail.getVisibilityText())
                .deleted(detail.getDeleted())
                .authorAmourId(detail.getAuthorAmourId())
                .authorName(detail.getAuthorName())
                .title(detail.getTitle())
                .summary(detail.getSummary())
                .content(detail.getContent())
                .chapterId(detail.getChapterId() == null ? null : String.valueOf(detail.getChapterId()))
                .chapterName(detail.getChapterName())
                .happenedTime(detail.getHappenedTime())
                .location(detail.getLocation())
                .coverImage(detail.getCoverImage())
                .tagLabel(detail.getTagLabel())
                .tagColor(detail.getTagColor())
                .isMilestone(detail.getMilestone())
                .createTime(detail.getCreateTime())
                .updateTime(detail.getUpdateTime())
                .pendingReportCount(detail.getPendingReportCount())
                .images(detail.getImages() == null ? null : detail.getImages().stream()
                        .map(image -> FindStoryDetailRspVO.ImageVO.builder()
                                .id(image.getId())
                                .url(image.getUrl())
                                .altText(image.getAltText())
                                .sortOrder(image.getSortOrder())
                                .build())
                        .collect(Collectors.toList()))
                .build());
    }

    @Override
    public Response<Void> updatePublishStatus(UpdateStoryVisibleStatusReqVO reqVO) {
        Integer visibility = reqVO.getVisibility();
        if (visibility == null && reqVO.getIsVisible() != null) {
            // 旧布尔值只映射为“成员可见/隐藏”，绝不把 true 当成公开。
            visibility = Boolean.TRUE.equals(reqVO.getIsVisible())
                    ? ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY
                    : ContentGovernanceConstants.VISIBILITY_HIDDEN;
        }
        if (visibility == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        AdminContentModerateReqVO moderate = new AdminContentModerateReqVO();
        moderate.setContentType(ContentGovernanceConstants.TYPE_STORY);
        moderate.setContentId(reqVO.getId());
        moderate.setSpaceId(reqVO.getSpaceId());
        moderate.setVisibility(visibility);
        moderate.setReason(reqVO.getReason());
        return adminContentGovernanceService.moderateVisibility(moderate);
    }

    @Override
    public Response<Void> deleteStory(DeleteStoryReqVO reqVO) {
        AdminContentDeleteReqVO delete = new AdminContentDeleteReqVO();
        delete.setContentType(ContentGovernanceConstants.TYPE_STORY);
        delete.setContentId(reqVO.getId());
        delete.setSpaceId(reqVO.getSpaceId());
        delete.setReason(reqVO.getReason());
        return adminContentGovernanceService.deleteContent(delete);
    }
}
