package com.chengliuxiang.amour.admin.service.impl;

import com.chengliuxiang.amour.admin.model.vo.anniversary.DeleteAnniversaryReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListReqVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.FindAnniversaryPageListRspVO;
import com.chengliuxiang.amour.admin.model.vo.anniversary.UpdateAnniversaryVisibleStatusReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDeleteReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentModerateReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageRspVO;
import com.chengliuxiang.amour.admin.service.AdminAnniversaryService;
import com.chengliuxiang.amour.admin.service.AdminContentGovernanceService;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminAnniversaryServiceImpl implements AdminAnniversaryService {

    @Resource
    private AdminContentGovernanceService adminContentGovernanceService;

    @Override
    public Response<PageResult<FindAnniversaryPageListRspVO>> findAnniversaryPageList(FindAnniversaryPageListReqVO reqVO) {
        AdminContentPageReqVO query = new AdminContentPageReqVO();
        query.setCurrent(reqVO.getCurrent());
        query.setSize(reqVO.getSize());
        query.setSpaceId(reqVO.getSpaceId());
        query.setKeyword(reqVO.getTitle());
        query.setVisibility(reqVO.getVisibility());
        query.setIncludeDeleted(reqVO.getIncludeDeleted());
        query.setContentType(ContentGovernanceConstants.TYPE_ANNIVERSARY);

        Response<PageResult<AdminContentPageRspVO>> response = adminContentGovernanceService.findPage(query);
        PageResult<AdminContentPageRspVO> page = response.getData();
        List<FindAnniversaryPageListRspVO> records = page.getRecords().stream()
                .map(item -> FindAnniversaryPageListRspVO.builder()
                        .id(item.getContentId())
                        .spaceId(item.getSpaceId())
                        .spaceCode(item.getSpaceCode())
                        .spaceName(item.getSpaceName())
                        .spaceStatus(item.getSpaceStatus())
                        .spaceVisibility(item.getSpaceVisibility())
                        .title(item.getTitle())
                        .description(item.getSummary())
                        .anniversaryDate(parseDate(item.getHappenedTime()))
                        .repeatType(item.getRepeatType())
                        .category(item.getCategoryName())
                        .colorCode(item.getColorCode())
                        .location(item.getLocation())
                        .sortOrder(item.getSortOrder())
                        .visibility(item.getVisibility())
                        .visibilityText(item.getVisibilityText())
                        .deleted(item.getDeleted())
                        .authorAmourId(item.getAuthorAmourId())
                        .authorName(item.getAuthorName())
                        .reportCount(item.getReportCount())
                        .pendingReportCount(item.getPendingReportCount())
                        .isVisible(item.getVisibility() == null
                                || item.getVisibility() != ContentGovernanceConstants.VISIBILITY_HIDDEN)
                        .createTime(item.getCreateTime())
                        .updateTime(item.getUpdateTime())
                        .build())
                .collect(Collectors.toList());
        return Response.success(PageResult.<FindAnniversaryPageListRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<FindAnniversaryDetailRspVO> findAnniversaryDetail(FindAnniversaryDetailReqVO reqVO) {
        AdminContentDetailReqVO query = new AdminContentDetailReqVO();
        query.setContentType(ContentGovernanceConstants.TYPE_ANNIVERSARY);
        query.setContentId(reqVO.getId());
        query.setSpaceId(reqVO.getSpaceId());
        Response<AdminContentDetailRspVO> response = adminContentGovernanceService.findDetail(query);
        AdminContentDetailRspVO detail = response.getData();
        return Response.success(FindAnniversaryDetailRspVO.builder()
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
                .description(detail.getSummary())
                .anniversaryDate(parseDate(detail.getAnniversaryDate()))
                .repeatType(detail.getRepeatType())
                .category(detail.getCategory())
                .colorCode(detail.getColorCode())
                .location(detail.getLocation())
                .sortOrder(detail.getSortOrder())
                .pendingReportCount(detail.getPendingReportCount())
                .isVisible(detail.getVisibility() == null
                        || detail.getVisibility() != ContentGovernanceConstants.VISIBILITY_HIDDEN)
                .createTime(detail.getCreateTime())
                .updateTime(detail.getUpdateTime())
                .build());
    }

    @Override
    public Response<Void> updateVisibleStatus(UpdateAnniversaryVisibleStatusReqVO reqVO) {
        Integer visibility = reqVO.getVisibility();
        if (visibility == null && reqVO.getIsVisible() != null) {
            visibility = Boolean.TRUE.equals(reqVO.getIsVisible())
                    ? ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY
                    : ContentGovernanceConstants.VISIBILITY_HIDDEN;
        }
        if (visibility == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        AdminContentModerateReqVO moderate = new AdminContentModerateReqVO();
        moderate.setContentType(ContentGovernanceConstants.TYPE_ANNIVERSARY);
        moderate.setContentId(reqVO.getId());
        moderate.setSpaceId(reqVO.getSpaceId());
        moderate.setVisibility(visibility);
        moderate.setReason(reqVO.getReason());
        return adminContentGovernanceService.moderateVisibility(moderate);
    }

    @Override
    public Response<Void> deleteAnniversary(DeleteAnniversaryReqVO reqVO) {
        AdminContentDeleteReqVO delete = new AdminContentDeleteReqVO();
        delete.setContentType(ContentGovernanceConstants.TYPE_ANNIVERSARY);
        delete.setContentId(reqVO.getId());
        delete.setSpaceId(reqVO.getSpaceId());
        delete.setReason(reqVO.getReason());
        return adminContentGovernanceService.deleteContent(delete);
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.length() < 10) {
            return null;
        }
        try {
            return LocalDate.parse(value.substring(0, 10));
        } catch (Exception exception) {
            return null;
        }
    }
}
